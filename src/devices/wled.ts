import { PinConfiguration } from "../config";

export class WledDevice implements PinConfiguration {
  name: string;
  topics: Array<string>;
  state: any;

  private colorTopic: string;
  private brightnessTopic: string;

  private handler: (state: any) => void;

  constructor(name: string, private topic: string) {
    this.name = name;
    this.colorTopic = `wled/${topic}/c`;
    this.brightnessTopic = `wled/${topic}/g`;
    this.topics = [];
    this.topics.push(this.colorTopic);
    this.topics.push(this.brightnessTopic);
    this.state = { brightness: "", color: "" };
  }

  onMessage(topic: string, payload: Buffer): void {
    if(topic == this.colorTopic) {
      this.state.color = payload.toString();
      console.log(`${this.topic} > ${JSON.stringify(this.state)}`);
      if(this.handler) {
        this.handler(this.state);
      }
    } else if (topic == this.brightnessTopic) {
      this.state.brightness = payload.toString();
      console.log(`${this.topic} > ${JSON.stringify(this.state)}`);
      if(this.handler) {
        this.handler(this.state);
      }
    }
  }

  writeState(value: any): { topic: string, value: any } {
    return {
      topic: `wled/${this.topic}`,
      value
    };
  }

  readState(): any {
    return this.state;
  }

  updateState(handler: (state: any) => void): void {
    this.handler = handler;
  }
}