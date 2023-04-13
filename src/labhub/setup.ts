import { Subscription, timer, take, concat, of, merge } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { DeviceStatus, DeviceStatusUpdate, SensorDataStream, DeviceDataFeed, DeviceDataFeedUpdate, HeaterDataStream, RgbDataStream, ClientChannelRequest, ClientChannelResponse } from '../types/common';
import { TOPIC_DEVICE_STATUS, TOPIC_DEVICE_STATUS_UPDATE, TOPIC_DEVICE_DATA_FEED, TOPIC_DEVICE_DATA_FEED_UPDATE, TOPIC_CLIENT_CHANNEL } from '../utils/const';
import { getUpdatedDeviceStatus } from './actions';
import { deviceStatus, sensorDataStream, heaterDataStream, rgbDataStream } from './status';
import { getClientType } from './utils';

let subsX1: Subscription;
let subsX2: Subscription;
let subsX3: Subscription;
let experimentActive = false;
let currTemp = 20;
let temperatureLog: number[] = [];
let voltageLog: number[] = [];

function resetSensorDataStream() {
  experimentActive = false;
  temperatureLog = [];
  voltageLog = [];

  deviceStatus.value.temperatureLog = [];
  deviceStatus.value.voltageLog = [];
  deviceStatus.next(deviceStatus.value);

  if (subsX1) subsX1.unsubscribe();
  sensorDataStream.next(null);
}

function resetHeaterDataStream() {
  experimentActive = false;
  currTemp = 20;
  if (subsX2) subsX2.unsubscribe();
  heaterDataStream.next(null);
}

function resetRgbDataStream(softReset?: boolean) {
  experimentActive = false;
  if (subsX3) subsX3.unsubscribe();

  if (softReset) {
    rgbDataStream.next(null);
  } else {
    updateDeviceStatus({ rgbCalibrated: false }, () => {
      rgbDataStream.next(null);
    });
  }
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
        resetSensorDataStream();
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
    const sc: any = { ...value };
    delete sc.temperatureLog;
    delete sc.voltageLog;
    socket.emit(TOPIC_DEVICE_STATUS, sc);
  });

  socket.on(TOPIC_DEVICE_DATA_FEED_UPDATE, ({ sensorExperiment, heaterExperiment, rgbExperiment }: DeviceDataFeedUpdate) => {
    if (sensorExperiment === false) {
      resetSensorDataStream();
    }

    if (heaterExperiment === false) {
      resetHeaterDataStream();
    }
    
    if (rgbExperiment === false) {
      resetRgbDataStream();
    }

    if (experimentActive) {
      resetSensorDataStream();
      resetHeaterDataStream();
      resetRgbDataStream(true);
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
          resetSensorDataStream();
        } else {
          let temperature = null;
          let voltage = null;
          if (sensorConnected === 'temperature') {
            temperature = Math.floor(Math.abs(90 * Math.sin(value/11)) * 10) / 10;
            if (typeof sensorDataStream.value?.temperature === 'number') {
              temperatureLog.push(sensorDataStream.value.temperature);
            }
          } else if (sensorConnected === 'voltage') {
            voltage = Math.floor(12 * Math.sin(value/7) *10) / 10;
            if (typeof sensorDataStream.value?.voltage === 'number') {
              voltageLog.push(sensorDataStream.value.voltage);
            }
          }

          deviceStatus.value.temperatureLog = temperatureLog;
          deviceStatus.value.voltageLog = voltageLog;
          deviceStatus.next(deviceStatus.value);

          // TODO: 376987
          const data: SensorDataStream = {
            temperature,
            temperatureIndex: temperature === null ? null : temperatureLog.length,
            temperatureLog: [],
            voltage,
            voltageIndex: voltage === null ? null : voltageLog.length,
            voltageLog: [],
          };
          sensorDataStream.next(data);
        }
      });

      if (sensorConnected === 'temperature') {
        deviceStatus.value.operation = 'measure_temperature';
        deviceStatus.next(deviceStatus.value);
      } else if (sensorConnected === 'voltage') {
        deviceStatus.value.operation = 'measure_voltage';
        deviceStatus.next(deviceStatus.value);
      }
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

      deviceStatus.value.operation = 'heater_control';
      deviceStatus.next(deviceStatus.value);
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
            if (value === 1) calibrateTest[value] = -0.1;
            if (value === 2) calibrateTest[value] = 0.2;
            const data: RgbDataStream = { calibrateTest, measure: null };
            rgbDataStream.next(data);
          });

          deviceStatus.value.operation = 'rgb_calibrate';
          deviceStatus.next(deviceStatus.value);    
        } else if (rgbConnected === 'measure') {
          subsX3 = source.subscribe((value) => {
            const measure = rgbDataStream.value?.measure || [null, null, null];
            if (value === 0) measure[value] = 1.37;
            if (value === 1) measure[value] = 0.36;
            if (value === 2) measure[value] = 3.46;
            const data: RgbDataStream = { calibrateTest: null, measure };
            rgbDataStream.next(data);
          });

          deviceStatus.value.operation = 'rgb_measure';
          deviceStatus.next(deviceStatus.value);    
        }
      }
    }
  });

  const source = merge(sensorDataStream, heaterDataStream, rgbDataStream);
  const subs2 = source.subscribe(() => {
    const deviceDataFeedValue: DeviceDataFeed = {
      sensor: sensorDataStream.value,
      heater: heaterDataStream.value,
      rgb: rgbDataStream.value,
    };
    socket.emit(TOPIC_DEVICE_DATA_FEED, deviceDataFeedValue);
  });

  socket.on(TOPIC_CLIENT_CHANNEL, ({ requestId, temperatureIndex, voltageIndex }: ClientChannelRequest, callback) => {
    const clientChannelResp: ClientChannelResponse = {
      requestId,
      temperatureLog: null,
      voltageLog: null,
    };
    if (typeof temperatureIndex === 'number' && temperatureIndex >= 0) {
      clientChannelResp.temperatureLog = deviceStatus.value.temperatureLog.slice(0, temperatureIndex);
    } else if (typeof voltageIndex === 'number' && voltageIndex >= 0) {
      clientChannelResp.voltageLog = deviceStatus.value.voltageLog.slice(0, voltageIndex);
    }

    // Acknowledgement: Sent to only the client that initiated the communication
    callback(clientChannelResp);
  });

  return [subs1, subs2];
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
        resetSensorDataStream();  // reset sensor stream
        resetHeaterDataStream();  // reset heater stream
        resetRgbDataStream();     // reset spectrophotometer stream
      });
    });
  } else if (clientType === 'member') {
    updateDeviceStatus({ memberUnjoin: clientId });  // remove client
  }
};
