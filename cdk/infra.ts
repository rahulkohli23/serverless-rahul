import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
  EndpointType,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import {
  ApiGateway,
  LambdaFunction as LambdaFunctionTarget,
} from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path from "path";

import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
} from "aws-cdk-lib/aws-dynamodb";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";

export class InfraStack extends Stack {
  //   private readonly distRoot = path.join(__dirname, "../build");

  //   private readonly code = Code.fromAsset(this.distRoot);
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const driverQueue = this.createQueue(this, "driver-tips-event-queue-ts");

    const table = this.createDynamoDbTable(
      this,
      "Driver-mgmt-table",
      "challenge-cloud-native-driver-mgmt-ts"
    );

    // handler to handle POST request
    const createDriverLambda = this.createLambda(
      this,
      "create-driver-handler",
      "handler",
      "handleCreateDriver"
    );
    table.grantReadWriteData(createDriverLambda);

    // handler to proccess GET request
    const getDriverLambda = this.createLambda(
      this,
      "get-driver-handler",
      "handler",
      "handleGetDriver"
    );
    table.grantReadWriteData(getDriverLambda);

    // handler responsible to generate driver test data
    const createDriverTestDataLambda = this.createLambda(
      this,
      "create-driver-test-data-handler",
      "test-data-handler",
      "handleCreateDriversTestData"
    );
    driverQueue.grantConsumeMessages(createDriverTestDataLambda);
    table.grantReadWriteData(createDriverTestDataLambda);
    createDriverTestDataLambda.addEventSource(new SqsEventSource(driverQueue));

    // handler responsible to generate tip test data
    const createDriverTipTestDataLambda = this.createLambda(
      this,
      "create-driver-tip-test-data-handler",
      "test-data-handler",
      "handleSampleDriverTippingEvent"
    );
    driverQueue.grantConsumeMessages(createDriverTipTestDataLambda);
    table.grantReadWriteData(createDriverTipTestDataLambda);
    createDriverTipTestDataLambda.addEventSource(
      new SqsEventSource(driverQueue)
    );

    // Schedule Rules
    new Rule(this, "test-data-driver-rule", {
      ruleName: "driver-test-data-scheduler-rule",
      enabled: true,
      targets: [new LambdaFunctionTarget(createDriverTestDataLambda)],
      schedule: Schedule.rate(Duration.minutes(2)),
    });

    new Rule(this, "test-data-tips-rule", {
      ruleName: "tips-test-data-scheduler-rule",
      enabled: false, // set to true when needed to generate tips
      targets: [new LambdaFunctionTarget(createDriverTipTestDataLambda)],
      schedule: Schedule.rate(Duration.minutes(1)),
    });

    // API GW
    const restApiGw = this.createApiGw(this, "DriverRestApiGw", "DriverApiGw");
    const root = restApiGw.restApi.root;
    const drivers = root.addResource("drivers");

    drivers.addMethod("POST", new LambdaIntegration(createDriverLambda));

    drivers
      .addResource("{id}")
      .addMethod("GET", new LambdaIntegration(getDriverLambda));
  }

  private createDynamoDbTable = (
    scope: Construct,
    id: string,
    tableName: string
  ) => {
    return new Table(scope, id, {
      tableName,
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: TableEncryption.DEFAULT,
    });
  };

  private createApiGw = (
    scope: Construct,
    id: string,
    restApiName: string,
    stageName = "dev"
  ) => {
    const restApi = new RestApi(scope, id, {
      restApiName,
      deployOptions: {
        stageName,
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
      },
      endpointTypes: [EndpointType.REGIONAL],
    });
    return new ApiGateway(restApi);
  };

  private createLambda = (
    scope: Construct,
    id: string,
    handlerName: string,
    handler: string,
    stage = "dev",
    nodeModules: string[] = []
  ): NodejsFunction => {
    return new NodejsFunction(scope, id, {
      entry: path.join(__dirname, "../src/", `${handlerName}.ts`),
      handler,
      bundling: {
        forceDockerBundling: false,
        nodeModules,
        minify: true,
        sourceMap: true,
        // Remember to keep ci, cdk lambda function, codebuild and tsconfig in sync
        target: "node16",
        tsconfig: "tsconfig.json",
      },
      // Remember to keep ci, cdk lambda function, codebuild and tsconfig in sync
      runtime: Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: {
        STAGE: stage,
        NODE_OPTIONS: "--enable-source-maps",
      },
    });
  };

  private createQueue = (scope: Construct, name: string): Queue => {
    return new Queue(scope, name, {
      queueName: name,
      encryption: QueueEncryption.KMS_MANAGED,
    });
  };
}
