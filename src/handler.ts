import type { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { v4 as uuid } from "uuid";

import { createDriver, getDriver } from "./driver";

export const handleCreateDriver = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  if (event.body == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "invalid input" }),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const driver = await createDriver({
    id: uuid(),
    ...JSON.parse(event.body),
  });

  return {
    statusCode: 201,
    body: JSON.stringify(driver),
  };
};

export const handleGetDriver = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  if (id == null) {
    return {
      statusCode: 400,
      body: "path parameter missing",
    };
  }

  const driver = await getDriver(id);

  return {
    statusCode: 200,
    body: JSON.stringify(driver),
  };
};
