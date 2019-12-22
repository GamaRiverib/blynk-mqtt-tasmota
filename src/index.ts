#!/usr/bin/env node

import { join } from "path";
import { readFileSync } from "fs";

import winston = require("winston");
import blynkLib = require("blynk-library");
import { connect, MqttClient, OnMessageCallback, Packet,
         IClientOptions, IClientSubscribeOptions, ISubscriptionGrant } from "mqtt";

import { getLogger } from "./logger";
import { TasmotaDevice, tasmotaDeviceFactory } from "./devices/tasmota";

const logger: winston.Logger = getLogger("[BLYNKBRIDGE]");

const BLYNK_AUTH_CODE: string = process.env.BLYNK_AUTH_CODE;

const BLYNK_OPTS: any = {
  connector: new blynkLib.TcpClient({
    addr: process.env.BLYNK_HOST,
    port: parseInt(process.env.BLYNK_PORT)
  })
};

const MQTT_HOST: string = process.env.MQTT_HOST;

const MQTT_OPTS: IClientOptions = {

};

let devices: Array<TasmotaDevice>;
let topics: Array<string> = [];
let blynkClient: any;
let mqttClient: MqttClient;

function onBlynkConnected(): void {
  logger.info("Blynk connected");
}

function onBlynkDisconnected(): void {
  logger.info("Blynk disconnected");
}

function onMqttConnected(): void {
  logger.info("MQTT connected");
  const opts: IClientSubscribeOptions = { qos: 0 };
  mqttClient.subscribe(topics, opts, (err: Error, granted: ISubscriptionGrant[]) => {
    if(err) {
      logger.warn(err);
      return;
    }
    granted.forEach((grant: ISubscriptionGrant, index: number) => {
      logger.info(`Subscribed to ${grant.topic} topic`);
    });
  });
}

const onMqttMessage: OnMessageCallback = (topic: string, payload: Buffer, packet: Packet): void => {
  logger.info(`${topic} ${payload.toString()}`);
  devices.forEach((device: TasmotaDevice) => device.onMessage(topic, payload));
};

function start(): void {
  logger.info("Starting...");

  logger.info("Connecting to Blynk Server...");
  blynkClient = new blynkLib.Blynk(BLYNK_AUTH_CODE, BLYNK_OPTS);

  logger.info("Loading devices configuration...");
  const path: string = join(__dirname, "../devices.json");
  const data: Buffer = readFileSync(path);
  const json: any = JSON.parse(data.toString());
  devices = tasmotaDeviceFactory(json);

  devices.forEach((device: TasmotaDevice, index: number) => {
    device.topics.forEach((topic: string) => topics.push(topic));
    const v = new blynkClient.VirtualPin(index);
    v.on("write", (param: any) => {
      const data = device.writeState(param);
      mqttClient.publish(data.topic, data.value);
      logger.info(`V${index} write ${data.value}`);
    });
    v.on("read", () => {
      const state: any = device.readState();
      v.write(state);
      logger.info(`V${index} read ${state}`);
    });
    device.updateState((state: any): void => {
      v.write(state);
      logger.info(`V${index} update ${state}`);
    });
  });

  blynkClient.on("connect", onBlynkConnected);
  blynkClient.on("disconnect", onBlynkDisconnected);
  logger.info("Connecting to Blynk Server...");

  logger.info("Connecting to MQTT Broker...");
  mqttClient = connect(MQTT_HOST, MQTT_OPTS);
  mqttClient.on("connect", onMqttConnected);
  mqttClient.on("message", onMqttMessage);
}

async function terminate(): Promise<void> {
  try {
    mqttClient.unsubscribe(topics);
    mqttClient.end();
    process.exit(0);
  } catch(err) {
    process.exit(1);
  }
}

if(process.platform == "win32") {
  const input = process.stdin;
  const output = process.stdout;
  const rl = require("readline");
  rl.createInterface({ input, output })
    .on("SIGINT", terminate);
}
process.on("SIGINT", terminate);

start();