import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { DeviceStatus, DeviceStatusUpdate } from '../types/common';
import { TOPIC_DEVICE_STATUS, TOPIC_DEVICE_STATUS_UPDATE } from '../utils/const';
import { getUpdatedDeviceStatus } from './actions';
import { deviceStatus } from './status';

export const initSetup = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {  
  socket.emit(TOPIC_DEVICE_STATUS, deviceStatus.value);

  socket.on(TOPIC_DEVICE_STATUS_UPDATE, (value: DeviceStatusUpdate) => {
    const deviceStatusNew = getUpdatedDeviceStatus(value);
    if (deviceStatusNew !== null) deviceStatus.next(deviceStatusNew);
  });

  const subs1 = deviceStatus.subscribe((value) => {
    if (value) {
      io.emit(TOPIC_DEVICE_STATUS, value);
    }
  });

  return [subs1];
};
