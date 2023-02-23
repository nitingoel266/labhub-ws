import { BehaviorSubject } from 'rxjs';
import { DeviceStatus } from '../types/common';

export const initialDeviceStatus: DeviceStatus = {
  deviceName: 'LabHub',
  deviceVersion: '2.10',
  batteryLevel: 75,
  leaderSelected: null,
  membersJoined: [],
  modeSelected: null,
  funcSelected: null,
};

export const deviceStatus = new BehaviorSubject<DeviceStatus | null>(initialDeviceStatus);
