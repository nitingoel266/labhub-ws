import { BehaviorSubject } from 'rxjs';
import { DeviceStatus, DeviceDataStream } from '../types/common';

export const initialDeviceStatus: DeviceStatus = {
  deviceName: 'LabHub',
  deviceVersion: '2.10',
  batteryLevel: 75,
  leaderSelected: null,
  membersJoined: [],
  modeSelected: null,
  funcSelected: null,
  setupData: { dataRate: 1, dataSample: 'cont' },
  sensorConnected: null,
};

export const deviceStatus = new BehaviorSubject<DeviceStatus>(initialDeviceStatus);
export const deviceDataStream = new BehaviorSubject<DeviceDataStream | null>(null);
