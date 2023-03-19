import { timer, take, concat, of, Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { DeviceStatus, DeviceStatusUpdate, DeviceDataStream, DeviceDataStatusUpdate, DeviceDataFeed, HeaterDataStream, RgbDataStream } from '../types/common';
import { TOPIC_DEVICE_STATUS, TOPIC_DEVICE_STATUS_UPDATE, TOPIC_DEVICE_DATA_STREAM, TOPIC_DEVICE_DATA_STATUS_UPDATE, TOPIC_DEVICE_DATA_FEED } from '../utils/const';
import { getUpdatedDeviceStatus } from './actions';
import { deviceStatus, deviceDataStream, heaterDataStream, rgbDataStream } from './status';
import { getClientType } from './utils';

let subsX1: Subscription;
let subsX2: Subscription;
let subsX3: Subscription;
let experimentActive = false;
let currTemp = 20;

function resetDeviceDataStream() {
  experimentActive = false;
  if (subsX1) subsX1.unsubscribe();
  deviceDataStream.next(null);
}

function resetHeaterDataStream() {
  experimentActive = false;
  currTemp = 20;
  if (subsX2) subsX2.unsubscribe();
  heaterDataStream.next(null);
}

function resetRgbDataStream() {
  experimentActive = false;
  if (subsX3) subsX3.unsubscribe();
  updateDeviceStatus({ rgbCalibrated: false }, () => {
    rgbDataStream.next(null);
  });
}

function updateDeviceStatus(value: DeviceStatusUpdate, callback?: Function) {
  const deviceStatusNew = getUpdatedDeviceStatus(value);
  if (deviceStatusNew !== null) {
    deviceStatus.next(deviceStatusNew);
    if (callback) callback();
  }
}

export const initSetup = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {  
  const clientId = socket.handshake.query.clientId as string;
  const clientType = getClientType(clientId);
  if (clientId && clientType === null) {
    deviceStatus.value.membersJoined.push(clientId);
    deviceStatus.next(deviceStatus.value);  // mark as updated
  }

  socket.emit(TOPIC_DEVICE_STATUS, deviceStatus.value);

  socket.on(TOPIC_DEVICE_STATUS_UPDATE, (value: DeviceStatusUpdate) => {
    updateDeviceStatus(value, () => {
      if (value.sensorConnected === null) {
        resetDeviceDataStream();
      }
      if (value.heaterConnected === null) {
        resetHeaterDataStream();
      }
      if (value.rgbConnected === null) {
        resetRgbDataStream();
      }
    });
  });

  const subs1 = deviceStatus.subscribe((value) => {
    socket.emit(TOPIC_DEVICE_STATUS, value);
  });

  socket.on(TOPIC_DEVICE_DATA_STATUS_UPDATE, ({ sensorExperiment, heaterExperiment, rgbExperiment }: DeviceDataStatusUpdate) => {
    if (sensorExperiment === false || experimentActive) {
      resetDeviceDataStream();
    }
    if (sensorExperiment === true) {
      experimentActive = true;
      const { sensorConnected, setupData } = deviceStatus.value;

      const dataRate = setupData.dataRate === 'user' ? 1 : setupData.dataRate;
      const dataRateMs = dataRate * 1000;

      const obs1 = timer(0, dataRateMs);
      const obs2 = concat(timer(0, dataRateMs).pipe(take(setupData.dataSample as number)), of(-1));
      const source = setupData.dataSample === 'cont' ? obs1 : obs2;

      subsX1 = source.subscribe((value) => {
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

    if (heaterExperiment === false || experimentActive) {
      resetHeaterDataStream();
    }
    if (heaterExperiment === true) {
      experimentActive = true;
      const { heaterConnected } = deviceStatus.value;

      subsX2 = timer(0, 1000).subscribe((value) => {
        const { setpointTemp } = deviceStatus.value;        
        const tempDiff1 = (setpointTemp - currTemp) / 8;
        const tempDiff2 = Math.abs(tempDiff1) > 0.1 ? tempDiff1 : (setpointTemp - currTemp);
        currTemp = currTemp + tempDiff2;
        const powerX = Math.round(tempDiff2 * 100) / 100;
        const currTempX = Math.round(currTemp * 100) / 100;
        const element: [number] | null = heaterConnected === 'element' ? [powerX] : null;
        const probe: [number, number] | null = heaterConnected === 'probe' ? [powerX, currTempX] : null;
        const data: HeaterDataStream = { element, probe };
        heaterDataStream.next(data);
      });
    }

    if (rgbExperiment === false || experimentActive) {
      resetRgbDataStream();
    }
    if (rgbExperiment === true) {
      const { rgbConnected, rgbCalibrated } = deviceStatus.value;
      if (rgbCalibrated) {
        experimentActive = true;
        const source = timer(0, 1000).pipe(take(3));
        if (rgbConnected === 'calibrate_test') {
          subsX3 = source.subscribe((value) => {
            const calibrateTest = rgbDataStream.value?.calibrateTest || [null, null, null];
            if (value === 0) calibrateTest[value] = 0;
            if (value === 1) calibrateTest[value] = -0.01;
            if (value === 2) calibrateTest[value] = 0.02;
            const data: RgbDataStream = { calibrateTest, measure: null };
            rgbDataStream.next(data);
          });
        } else if (rgbConnected === 'measure') {
          subsX3 = source.subscribe((value) => {
            const measure = rgbDataStream.value?.measure || [null, null, null];
            if (value === 0) measure[value] = 1.37;
            if (value === 1) measure[value] = 0.36;
            if (value === 2) measure[value] = 3.46;
            const data: RgbDataStream = { calibrateTest: null, measure };
            rgbDataStream.next(data);
          });
        }
      }
    }
  });

  const subs2 = deviceDataStream.subscribe((value) => {
    socket.emit(TOPIC_DEVICE_DATA_STREAM, value);
  });

  const subs3 = timer(0, 1000).subscribe(() => {
    const deviceDataFeedValue: DeviceDataFeed = {
      sensor: deviceDataStream.value,
      heater: heaterDataStream.value,
      rgb: rgbDataStream.value,
    };
    socket.emit(TOPIC_DEVICE_DATA_FEED, deviceDataFeedValue);
  });

  return [subs1, subs2, subs3];
};

export const uninitSetup = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
  const clientId = socket.handshake.query.clientId as string;
  const clientType = getClientType(clientId);
  if (clientType === 'leader') {
    updateDeviceStatus({ leaderSelected: null }, () => {  // downgrade to member
      updateDeviceStatus({
        memberUnjoin: clientId,   // remove client
        sensorConnected: null,    // disconnect sensor
        heaterConnected: null,    // disconnect heater
        rgbConnected: null,       // disconnect spectrophotometer
      }, () => {
        resetDeviceDataStream();  // reset sensor stream
        resetHeaterDataStream();  // reset heater stream
        resetRgbDataStream();     // reset spectrophotometer stream
      });
    });
  } else if (clientType === 'member') {
    updateDeviceStatus({ memberUnjoin: clientId });  // remove client
  }
};
