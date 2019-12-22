#!/usr/bin/env node

import winston = require("winston");
import blynkLib = require("blynk-library");
import { connect, MqttClient, OnMessageCallback, Packet, IClientOptions, IClientSubscribeOptions, ISubscriptionGrant } from "mqtt";
import { getLogger } from "./logger";
import { configuration, PinConfiguration } from "./config";

const logger: winston.Logger = getLogger("[BLYNKBRIDGE]");

let topics: Array<string> = [];
configuration.forEach((config: PinConfiguration) => {
  config.topics.forEach((t: string) => topics.push(t));
});

const BLYNK_AUTH_CODE: string = "FB5TgNpi4BCk12Q2vF8MHvIpWeQmRdJ-";

const BLYNK_OPTS: any = {
  connector: new blynkLib.TcpClient({
    addr: "192.168.0.120",
    port: 8400
  })
};

const MQTT_HOST: string = "mqtt://192.168.0.117:1883";

const MQTT_OPTS: IClientOptions = {

};

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
  configuration.forEach((v: PinConfiguration) => v.onMessage(topic, payload));
};

function start(): void {
  logger.info("Starting...");

  blynkClient = new blynkLib.Blynk(BLYNK_AUTH_CODE, BLYNK_OPTS);

  configuration.forEach((p: PinConfiguration, index: number) => {
    const v = new blynkClient.VirtualPin(index);
    v.on("write", (param: any) => {
      const data = p.writeState(param);
      mqttClient.publish(data.topic, data.value);
      logger.info(`V${index} write ${data.value}`);
    });
    v.on("read", () => {
      const state: any = p.readState();
      v.write(state);
      logger.info(`V${index} read ${state}`);
    });
    p.updateState((state: any): void => {
      v.write(state);
      logger.info(`V${index} update ${state}`);
    });
  });

  blynkClient.on("connect", onBlynkConnected);
  blynkClient.on("disconnect", onBlynkDisconnected);
  logger.info("Connecting to Blynk Server...");

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