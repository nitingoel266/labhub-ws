import { deviceStatus, initialDeviceStatus } from './status';
import { DeviceStatus, DeviceStatusUpdate } from '../types/common';

function removeMember(membersList: string[], clientId: string) {
  if (membersList.includes(clientId as string)) {
    const idx = membersList.indexOf(clientId as string);
    if (idx >= 0) membersList.splice(idx, 1);
  } else {
    console.warn('[WARN] Unexpected! clientId missing from membersJoined list.');
    return;
  }
  if (membersList.includes(clientId as string)) {
    console.warn('[WARN] Unexpected! Duplicate clientId found in membersJoined list.');
  }
}

function addMember(membersList: string[], clientId: string) {
  if (!membersList.includes(clientId as string)) {
    membersList.push(clientId);
  } else {
    console.warn('[WARN] Unexpected! clientId already exists in membersJoined list.');
  }
}

export const getUpdatedDeviceStatus = (value: DeviceStatusUpdate) => {
  if (!deviceStatus.value) return null;

  let deviceStatusNew: DeviceStatus = { ...deviceStatus.value };
  Object.entries({ ...value }).forEach(([key, value]) => {
    if (value === undefined) return;

    const condx = key === 'resetAll' && value === true;
    // const condx1 = key === 'memberJoined' && value !== null && deviceStatusNew.leaderSelected !== null && deviceStatusNew.leaderSelected !== value && !deviceStatusNew.membersJoined.includes(value as string);
    const condx2 = key === 'memberUnjoin' && value !== null && deviceStatusNew.leaderSelected !== value && deviceStatusNew.membersJoined.includes(value as string);
 
    if (condx) {
      deviceStatusNew = { ...initialDeviceStatus };
    }
    // else if (condx1) {
    //   deviceStatusNew.membersJoined.push(value as string);
    // }
    else if (condx2) {
      removeMember(deviceStatusNew.membersJoined, value as string);
    } else if (key === 'leaderSelected') {
      if (value !== null && deviceStatusNew[key] === null) {
        removeMember(deviceStatusNew.membersJoined, value as string);
        deviceStatusNew = { ...deviceStatusNew, [key]: value as string };  
      } else if (value === null && deviceStatusNew[key]) {
        const clientId = deviceStatusNew[key] as string;
        deviceStatusNew = { ...deviceStatusNew, [key]: value };
        if (clientId) addMember(deviceStatusNew.membersJoined, clientId);
      }
    } else if (key === 'setupData' || key === 'sensorConnected' || key === 'setpointTemp' || key === 'heaterConnected' || key === 'rgbCalibrated' || key === 'rgbCalibratedAndTested' || key === 'rgbConnected' || key === 'screenNumber') {
      deviceStatusNew = { ...deviceStatusNew, [key]: value };
    }
  });

  return deviceStatusNew;
};
