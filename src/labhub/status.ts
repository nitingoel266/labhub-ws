import { BehaviorSubject } from 'rxjs';
import { DeviceStatus, DeviceDataStream, HeaterDataStream, RgbDataStream } from '../types/common';

export const initialDeviceStatus: DeviceStatus = {
  deviceName: 'LabHub',
  deviceVersion: '2.10',
  batteryLevel: 75,
  leaderSelected: null,
  membersJoined: [],
  setupData: { dataRate: 1, dataSample: 'cont' },
  sensorConnected: null,
  setpointTemp: 25,  // default setpoint temperature (in *C)
  heaterConnected: null,
  rgbCalibrated: false,
  rgbConnected: null,
};

export const deviceStatus = new BehaviorSubject<DeviceStatus>(initialDeviceStatus);
export const deviceDataStream = new BehaviorSubject<DeviceDataStream | null>(null);
export const heaterDataStream = new BehaviorSubject<HeaterDataStream | null>(null);
export const rgbDataStream = new BehaviorSubject<RgbDataStream | null>(null);
