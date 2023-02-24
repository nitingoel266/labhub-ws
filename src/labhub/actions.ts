import { deviceStatus, initialDeviceStatus } from './status';
import { DeviceStatus, DeviceStatusUpdate } from '../types/common';

export const getUpdatedDeviceStatus = (value: DeviceStatusUpdate) => {
  if (!deviceStatus.value) return null;

  let deviceStatusNew: DeviceStatus = { ...deviceStatus.value };
  Object.entries({ ...value }).forEach(([key, value]) => {
    // +ve cond
    const condx1 = key === 'memberJoined' && value !== null && deviceStatusNew.leaderSelected !== null && deviceStatusNew.leaderSelected !== value && !deviceStatusNew.membersJoined.includes(value as string);
    const condx2 = key === 'memberUnjoin' && value !== null && deviceStatusNew.leaderSelected !== null && deviceStatusNew.leaderSelected !== value && deviceStatusNew.membersJoined.includes(value as string);
    const condx = key === 'resetAll' && value === true;

    // -ve cond (none of these should be true)
    const cond1 = value === undefined;
    const cond2 = key === 'leaderSelected' && value !== null && deviceStatusNew[key] !== null;
    const cond3 = key === 'memberJoined';
 
    if (condx) {
      deviceStatusNew = { ...initialDeviceStatus };
    } else if (condx1) {
      deviceStatusNew.membersJoined.push(value as string);
    } else if (condx2) {
      const idx = deviceStatusNew.membersJoined.indexOf(value as string);
      if (idx >= 0) deviceStatusNew.membersJoined.splice(idx, 1);
    } else if (!cond1 && !cond2 && !cond3) {
      deviceStatusNew = { ...deviceStatusNew, [key]: value };

      if (key === 'leaderSelected') {
        deviceStatusNew.membersJoined = [];
      }
    }
  });
  return deviceStatusNew;
};
