import { BehaviorSubject } from 'rxjs';
import { DeviceStatus } from '../types/common';

const initialDeviceStatus: DeviceStatus = {
  deviceName: 'LabHub',
  deviceVersion: '2.10',
  batteryLevel: 75,
  leaderSelected: null,
  membersRegistered: [],
  modeSelected: null,
  functionSelected: null,
};

export const deviceStatus = new BehaviorSubject<DeviceStatus | null>(initialDeviceStatus);
