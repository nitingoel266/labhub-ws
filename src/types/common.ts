export type ClientType = 'leader' | 'member' | null;

export type SensorSelect = 'temperature' | 'voltage' | null;
export type HeaterSelect = 'element' | 'probe' | null;
export type RgbFuncSelect = 'calibrate_test' | 'measure' | null;

export interface SetupData {
  dataRate: 1 | 5 | 10 | 30 | 60 | 600 | 1800 | 3600 | 'user';
  dataSample: 'cont' | 5 | 10 | 25 | 50 | 100 | 200;
}

export interface DeviceStatus {
  deviceName: string;
  deviceVersion: string;
  batteryLevel: number;  // in percentage
  leaderSelected: string | null;  // leader ID
  membersJoined: string[];
  setupData: SetupData;
  sensorConnected: SensorSelect;
  setpointTemp: number;  // setpoint temperature (in *C)
  heaterConnected: HeaterSelect;
  rgbCalibrated: boolean;
  rgbConnected: RgbFuncSelect;
}

export interface DeviceStatusUpdate {
  leaderSelected?: string | null;
  // memberJoined?: string;
  memberUnjoin?: string;
  resetAll?: boolean;
  setupData?: SetupData;
  sensorConnected?: SensorSelect;
  setpointTemp?: number;
  heaterConnected?: HeaterSelect;
  rgbCalibrated?: boolean;
  rgbConnected?: RgbFuncSelect;
}

export interface DeviceDataStream {
  temperature: number | null;
  voltage: number | null;
}

export interface HeaterDataStream {
  element: [number] | null;       // [power]
  probe: [number, number] | null; // [power, probe_temperature]
}

export interface RgbDataStream {
  calibrateTest: [number | null, number | null, number | null] | null;   // [r, g, b]
  measure: [number | null, number | null, number | null] | null;         // [r, g, b]
}

export interface DeviceDataStatusUpdate {
  sensorExperiment?: boolean;
  heaterExperiment?: boolean;
  rgbExperiment?: boolean;
}

export interface DeviceDataFeed {
  sensor: DeviceDataStream | null;
  heater: HeaterDataStream | null;
  rgb: RgbDataStream | null;
}
