import { BehaviorSubject } from 'rxjs';
import { DeviceStatus, SensorDataStream, HeaterDataStream, RgbDataStream } from '../types/common';

export const initialDeviceStatus: DeviceStatus = {
  deviceName: 'LabHub',
  deviceVersion: '2.10',
  deviceSerial: '',
  deviceManufacturer: '',
  batteryLevel: 70,
  leaderSelected: null,
  membersJoined: [],
  setupData: { dataRate: 1, dataSample: 'cont' },
  sensorConnected: null,
  setpointTemp: 25,  // default setpoint temperature (in *C)
  heaterConnected: null,
  rgbCalibrated: false,
  rgbCalibratedAndTested: false,
  rgbConnected: null,
  screenNumber: null,
  operationPrev: null,
  operation: null,
  temperatureLog: [],
  voltageLog: [],
};

export const deviceStatus = new BehaviorSubject<DeviceStatus>(initialDeviceStatus);
export const sensorDataStream = new BehaviorSubject<SensorDataStream | null>(null);
export const heaterDataStream = new BehaviorSubject<HeaterDataStream | null>(null);
export const rgbDataStream = new BehaviorSubject<RgbDataStream | null>(null);
