export interface DeviceStatus {
  deviceName: string;
  deviceVersion: string;
  batteryLevel: number;  // in percentage
  leaderSelected: string | null;  // leader ID
  membersJoined: string[];
  modeSelected: 'manual' | 'project' | null;
  funcSelected: 'data_setup' | 'sensors' | 'heater' | 'rgb_spect' | null;
}

export interface DeviceStatusUpdate {
  leaderSelected?: string | null;
  memberJoined?: string | null;
  modeSelected?: 'manual' | 'project' | null;
  funcSelected?: 'data_setup' | 'sensors' | 'heater' | 'rgb_spect' | null;
  resetAll?: boolean;
}
