import { PinConfiguration } from "../config";

export class TasmotaDevice implements PinConfiguration {
  name: string;
  topics: Array<string>;
  state: any;

  private statusTopic: string;
  private stateTopic: string;
  private commandTopic: string;

  private handler: (state: any) => void;

  constructor(name: string, private topic: string, private devicePin: string) {
    this.name = name;
    this.statusTopic = `${topic}/stat/${devicePin}`;
    this.stateTopic = `${topic}/tele/STATE`;
    this.commandTopic = `${topic}/cmnd/${devicePin}`;
    this.topics = [];
    this.topics.push(this.statusTopic);
    this.topics.push(this.stateTopic);
    this.state = "";
  }

  onMessage(topic: string, payload: Buffer): void {
    if(topic == this.statusTopic) {
      this.state = payload.toString();
      console.log(`${this.topic}.${this.devicePin} > ${this.state}`);
      if(this.handler) {
        this.handler(this.readState());
      }
    } else if (topic == this.stateTopic) {
      const json: any = JSON.parse(payload.toString());
      if (json && json[this.devicePin]) {
        this.state = json[this.devicePin];
        console.log(`${this.topic}.${this.devicePin} > ${this.state}`);
        if(this.handler) {
          this.handler(this.readState());
        }
      }
    }
  }

  writeState(value: any): { topic: string, value: any } {
    return {
      topic: this.commandTopic,
      value: value > 0 ? "ON" : "OFF"
    };
  }

  readState(): any {
    return this.state == "ON" ? 1 : 0;
  }

  updateState(handler: (state: any) => void): void {
    this.handler = handler;
  }
}