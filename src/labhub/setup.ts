import { interval, Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { DeviceStatus, DeviceStatusUpdate, DeviceDataStream, DeviceDataStatusUpdate } from '../types/common';
import { TOPIC_DEVICE_STATUS, TOPIC_DEVICE_STATUS_UPDATE, TOPIC_DEVICE_DATA_STREAM, TOPIC_DEVICE_DATA_STATUS_UPDATE } from '../utils/const';
import { getUpdatedDeviceStatus } from './actions';
import { deviceStatus, deviceDataStream } from './status';

export const initSetup = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {  
  socket.emit(TOPIC_DEVICE_STATUS, deviceStatus.value);

  socket.on(TOPIC_DEVICE_STATUS_UPDATE, (value: DeviceStatusUpdate) => {
    const deviceStatusNew = getUpdatedDeviceStatus(value);
    if (deviceStatusNew !== null) {
      deviceStatus.next(deviceStatusNew);
      if (value.sensorConnected === null) {
        resetDeviceDataStream();
      }
    }
  });

  const subs1 = deviceStatus.subscribe((value) => {
    socket.emit(TOPIC_DEVICE_STATUS, value);
  });

  let subsX2: Subscription;
  let experimentActive = false;
  function resetDeviceDataStream() {
    experimentActive = false;
    if (subsX2) subsX2.unsubscribe();
    deviceDataStream.next(null);
  }

  socket.on(TOPIC_DEVICE_DATA_STATUS_UPDATE, ({ sensorExperiment }: DeviceDataStatusUpdate) => {
    if (sensorExperiment === false || experimentActive) {
      resetDeviceDataStream();
    }
    if (sensorExperiment === true) {
      experimentActive = true;
      const sensorConnected = deviceStatus.value.sensorConnected;
      subsX2 = interval(3500).subscribe((value) => {
        const temperature = sensorConnected === 'temperature' ? Math.floor(Math.abs(90 * Math.sin(value/11)) * 10) / 10 : null;
        const voltage = sensorConnected === 'voltage' ? Math.floor(12 * Math.sin(value/7) *10) / 10 : null;
        const data: DeviceDataStream = { temperature, voltage };
        deviceDataStream.next(data);
        // TODO: experimentActive = false, when sample size is finished
      });
    }
  });

  const subs2 = deviceDataStream.subscribe((value) => {
    socket.emit(TOPIC_DEVICE_DATA_STREAM, value);
  });

  return [subs1, subs2];
};
