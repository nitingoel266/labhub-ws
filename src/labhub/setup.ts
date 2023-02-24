import { timer, take, concat, of, Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { DeviceStatus, DeviceStatusUpdate, DeviceDataStream, DeviceDataStatusUpdate } from '../types/common';
import { TOPIC_DEVICE_STATUS, TOPIC_DEVICE_STATUS_UPDATE, TOPIC_DEVICE_DATA_STREAM, TOPIC_DEVICE_DATA_STATUS_UPDATE } from '../utils/const';
import { getUpdatedDeviceStatus } from './actions';
import { deviceStatus, deviceDataStream } from './status';
import { getClientType } from './utils';

function updateDeviceStatus(value: DeviceStatusUpdate, callback?: Function) {
  const deviceStatusNew = getUpdatedDeviceStatus(value);
  if (deviceStatusNew !== null) {
    deviceStatus.next(deviceStatusNew);
    if (callback) callback();
  }
}

export const initSetup = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {  
  socket.emit(TOPIC_DEVICE_STATUS, deviceStatus.value);

  socket.on(TOPIC_DEVICE_STATUS_UPDATE, (value: DeviceStatusUpdate) => {
    updateDeviceStatus(value, () => {
      if (value.sensorConnected === null) {
        resetDeviceDataStream();
      }  
    });
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
      const { sensorConnected, setupData } = deviceStatus.value;

      // TODO: Handle `manual` data rate
      const dataRate = typeof setupData.dataRate === 'number' ? setupData.dataRate : 1;
      const dataRateMs = dataRate * 1000;

      const obs1 = timer(0, dataRateMs);
      const obs2 = concat(timer(0, dataRateMs).pipe(take(setupData.dataSample as number)), of(-1));
      const source = setupData.dataSample === 'cont' ? obs1 : obs2;

      subsX2 = source.subscribe((value) => {
        if (value < 0) {
          deviceDataStream.next(null);
        } else {
          const temperature = sensorConnected === 'temperature' ? Math.floor(Math.abs(90 * Math.sin(value/11)) * 10) / 10 : null;
          const voltage = sensorConnected === 'voltage' ? Math.floor(12 * Math.sin(value/7) *10) / 10 : null;
          const data: DeviceDataStream = { temperature, voltage };
          deviceDataStream.next(data);
        }
      });
    }
  });

  const subs2 = deviceDataStream.subscribe((value) => {
    socket.emit(TOPIC_DEVICE_DATA_STREAM, value);
  });

  return [subs1, subs2];
};

export const uninitSetup = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
  const clientId = socket.handshake.query.clientId as string;
  const clientType = getClientType(clientId);
  if (clientType === 'leader') {
    updateDeviceStatus({ leaderSelected: null });
  } else if (clientType === 'member') {
    updateDeviceStatus({ memberUnjoin: clientId });
  }
};
