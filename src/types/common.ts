export interface DeviceStatus {
  deviceName: string;
  deviceVersion: string;
  batteryLevel: number;  // in percentage
  leaderSelected: string | null;  // leader ID
  membersRegistered: string[];
  modeSelected: 'manual' | 'project' | null;
  functionSelected: string | null;  // Data Setup, Sensors, Heater, and RGB Spect
}

export interface DeviceStatusUpdate {
  leaderSelected?: string | null;
  modeSelected?: 'manual' | 'project' | null;
}
