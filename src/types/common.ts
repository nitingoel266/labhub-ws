export type ModeSelect = 'manual' | 'project' | null;
export type FuncSelect = 'data_setup' | 'sensors' | 'heater' | 'rgb_spect' | null;
export type SensorSelect = 'temperature' | 'voltage' | null;

export interface SetupData {
  dataRate: 1 | 5 | 10 | 30 | 60 | 600 | 1800 | 3600 | 'manual';
  dataSample: 'cont' | 5 | 10 | 25 | 50 | 100 | 200;
}

export interface DeviceStatus {
  deviceName: string;
  deviceVersion: string;
  batteryLevel: number;  // in percentage
  leaderSelected: string | null;  // leader ID
  membersJoined: string[];
  modeSelected: ModeSelect;
  funcSelected: FuncSelect;
  setupData: SetupData;
  sensorConnected: SensorSelect;
}

export interface DeviceStatusUpdate {
  leaderSelected?: string | null;
  memberJoined?: string | null;
  modeSelected?: ModeSelect;
  funcSelected?: FuncSelect;
  resetAll?: boolean;
  setupData?: SetupData;
  sensorConnected?: SensorSelect;
}
