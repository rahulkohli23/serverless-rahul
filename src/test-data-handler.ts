import { SQS } from "aws-sdk";
import { v4 as uuid } from "uuid";

import { createDriver, getDrivers } from "./driver";

const sqs = new SQS();

export const handleCreateDriversTestData = async (): Promise<void> => {
  const drivers = await getDrivers();

  if (drivers.length === 0) {
    console.log(`creating test data`);
    await createDriver({
      id: uuid(),
      firstname: "Linda",
      lastname: "Doe",
      driverLicenseId: "12345",
    });

    await createDriver({
      id: uuid(),
      firstname: "Dean",
      lastname: "Driver",
      driverLicenseId: "9654321",
    });
  } else {
    console.log(
      `skipping test data creation ${drivers.length} drivers exist already`
    );
  }
};

export const handleSampleDriverTippingEvent = async (): Promise<void> => {
  const drivers = await getDrivers();
  const queueUrl = process.env.DRIVER_TIPS_QUEUE_URL;

  if (drivers.length > 0 && queueUrl) {
    const body = {
      driverId: drivers[Math.floor(Math.random() * drivers.length)].id,
      amount: (Math.random() * 10).toFixed(2),
      eventTime: new Date().toISOString(),
    };

    console.log(`sending sample tipping event ${JSON.stringify(body)}`);

    await sqs
      .sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(body),
      })
      .promise();
  }
};
