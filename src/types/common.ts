export type ClientType = 'leader' | 'member' | null;

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
  setupData: SetupData;
  sensorConnected: SensorSelect;
}

export interface DeviceStatusUpdate {
  leaderSelected?: string | null;
  memberJoined?: string;
  memberUnjoin?: string;
  resetAll?: boolean;
  setupData?: SetupData;
  sensorConnected?: SensorSelect;
}

export interface DeviceDataStream {
  temperature: number | null;
  voltage: number | null;
}

export interface DeviceDataStatusUpdate {
  sensorExperiment?: boolean;
}
