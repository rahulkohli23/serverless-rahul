/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { DynamoDB } from "aws-sdk";
import type { DocumentClient } from "aws-sdk/clients/dynamodb";

const dynamo = new DynamoDB.DocumentClient();
const table = "challenge-cloud-native-driver-mgmt-ts";

export type Driver = {
  id: string;
  firstname: string;
  lastname: string;
  driverLicenseId: string;
};

const toDriver = ({
  id,
  firstname,
  lastname,
  driverLicenseId,
}: DocumentClient.AttributeMap): Driver => ({
  id,
  firstname,
  lastname,
  driverLicenseId,
});

export const createDriver = async (driver: Driver): Promise<Driver> => {
  const { id, lastname, driverLicenseId } = driver;

  await dynamo
    .put({
      TableName: table,
      Item: {
        id,
        lastname,
        driverLicenseId,
      },
    })
    .promise();

  return driver;
};

export const getDriver = async (driverId: string): Promise<Driver | null> => {
  const { Item } = await dynamo
    .get({
      TableName: table,
      Key: {
        id: driverId,
      },
    })
    .promise();

  return Item ? toDriver(Item) : null;
};

export const getDrivers = async (): Promise<Driver[]> => {
  const { Items } = await dynamo
    .scan({
      TableName: table,
    })
    .promise();

  return Items ? Items.map((i) => toDriver(i)) : [];
};
