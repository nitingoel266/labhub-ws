import { deviceStatus } from './status';
import { DeviceStatus, DeviceStatusUpdate } from '../types/common';

export const getUpdatedDeviceStatus = (value: DeviceStatusUpdate) => {
  if (!deviceStatus.value) return null;

  let deviceStatusNew: DeviceStatus = { ...deviceStatus.value };
  Object.entries({ ...value }).forEach(([key, value]) => {
    const cond1 = value === undefined;
    const cond2 = key === 'leaderSelected' && value !== null && deviceStatusNew[key] !== null;
    if (!cond1 && !cond2) {
      deviceStatusNew = { ...deviceStatusNew, [key]: value };
    }
  });
  return deviceStatusNew;
};
