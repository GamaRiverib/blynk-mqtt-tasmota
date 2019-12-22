export interface TasmotaDevice {
  name: string;
  topics: Array<string>,
  state: any;
  onMessage: (topic: string, payload: Buffer) => void;
  writeState: (value: any) => { topic: string, value: any };
  readState: () => any;
  updateState: (handler: (state: any) => void) => void;
}

export function tasmotaDeviceFactory(data: any): Array<TasmotaDevice> {
  let devices: Array<TasmotaDevice> = [];
  if (Array.isArray(data)) {
    data.forEach((item: any) => {
      if(!item.name || !item.topic || !item.devicePin) {
        throw new Error("Missing configuration parameter for device");
      }
      const device: TasmotaDevice = new TasmotaDeviceImpl(item.name, item.topic, item.devicePin);
      devices.push(device);
    });
  } else {
    throw new Error("Data parameter must be an array");
  }
  return devices;
}

export class TasmotaDeviceImpl implements TasmotaDevice {
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
      if(this.handler) {
        this.handler(this.readState());
      }
    } else if (topic == this.stateTopic) {
      const json: any = JSON.parse(payload.toString());
      if (json && json[this.devicePin]) {
        this.state = json[this.devicePin];
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