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
      if(!item.name || !item.topic) {
        throw new Error("Missing configuration parameter for device");
      }
      if (item.sensor && item.sensor.name && item.sensor.value) {
        const sensor: TasmotaSensor = new TasmotaSensor(item.name, item.topic, item.sensor.name, item.sensor.value);
        devices.push(sensor);
      } else {
        const device: TasmotaDevice = new TasmotaDeviceImpl(item.name, item.topic, item.devicePin || "POWER");
        devices.push(device);
      }
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

export class TasmotaSensor implements TasmotaDevice {
  
  name: string;
  topics: string[];
  state: any;

  private sensorTopic: string;

  private handler: (state: any) => void;

  constructor(name: string, topic: string, private sensorName: string, private sensorVal: string) {
    this.name = name;
    this.topics = [];
    this.sensorTopic = `${topic}/tele/SENSOR`;
    this.topics.push(this.sensorTopic);
    this.state = 0;
  }

  onMessage(topic: string, payload: Buffer): void {
    if (topic == this.sensorTopic) {
      const json: any = JSON.parse(payload.toString());
      if(json[this.sensorName]) {
        const sensor: any = json[this.sensorName];
        if(sensor[this.sensorVal]) {
          this.state = sensor[this.sensorVal];
          this.handler(this.readState());
        }
      }
    }
  }

  writeState(value: any): { topic: string, value: any } {
    return null;
  }

  readState(): any {
    return this.state;
  }

  updateState(handler: (state: any) => void) {
    this.handler = handler;
  }

}