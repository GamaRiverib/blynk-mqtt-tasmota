import { TasmotaDevice } from "./devices/tasmota";
import { WledDevice } from "./devices/wled";

export interface PinConfiguration {
  name: string;
  topics: Array<string>,
  state: any;
  onMessage: (topic: string, payload: Buffer) => void;
  writeState: (value: any) => { topic: string, value: any };
  readState: () => any;
  updateState: (handler: (state: any) => void) => void;
}
export const configuration: Array<PinConfiguration> = [
  new TasmotaDevice("Cochera", "cochera", "POWER"),
  new TasmotaDevice("Cocina", "cocina", "POWER4"), 
  new TasmotaDevice("Patio", "cocina", "POWER3"),
  new TasmotaDevice("Pasillo", "cocina", "POWER2"),
  new TasmotaDevice("Recamara", "recamara1", "POWER"),
  new TasmotaDevice("Socket 1", "socket01", "POWER"),
  new TasmotaDevice("Socket 2", "socket02", "POWER"),
  new WledDevice("LEDs Ventana Sala", "sala/ventana")
];