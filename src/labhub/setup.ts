import { Subscription, timer, take, concat, of, merge, delay } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { DeviceStatus, DeviceStatusUpdate, SensorDataStream, DeviceDataFeed, DeviceDataFeedUpdate, HeaterDataStream, RgbDataStream, ClientChannelRequest, ClientChannelResponse, LeaderOperation } from '../types/common';
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
  if (experimentActive) {
    experimentActive = false;
    resetOperation();
  }

  temperatureLog = [];
  voltageLog = [];

  deviceStatus.value.temperatureLog = [];
  deviceStatus.value.voltageLog = [];

  deviceStatus.next(deviceStatus.value);

  if (subsX1) subsX1.unsubscribe();
  sensorDataStream.next(null);
}

function resetHeaterDataStream() {
  if (experimentActive) {
    experimentActive = false;
    resetOperation();
  }

  // signal any changes in deviceStatus
  deviceStatus.next(deviceStatus.value);

  currTemp = 20;
  if (subsX2) subsX2.unsubscribe();
  heaterDataStream.next(null);
}

function resetRgbDataStream(softReset?: boolean) {
  if (experimentActive) {
    experimentActive = false;
    resetOperation();
  }

  // signal any changes in deviceStatus
  deviceStatus.next(deviceStatus.value);

  if (subsX3) subsX3.unsubscribe();

  if (softReset) {
    // const { rgbConnected } = deviceStatus.value;
    if (rgbDataStream.value?.calibrateTest) {
      // do not reset calibrateTest value
      rgbDataStream.next({ calibrateTest: rgbDataStream.value.calibrateTest, measure: null });
    } else {
      rgbDataStream.next(null);
    }
  } else {
    // updateDeviceStatus({ rgbCalibrated: false }, () => {
    //   rgbDataStream.next(null);
    // });
    rgbDataStream.next(null);
  }
}

function updateDeviceStatus(value: DeviceStatusUpdate, callback?: Function) {
  const deviceStatusNew = getUpdatedDeviceStatus(value);
  if (deviceStatusNew !== null) {
    deviceStatus.next(deviceStatusNew);
    if (callback) callback();
  }
}

function setOperation(operation: LeaderOperation) {
  deviceStatus.value.operation = operation;
}

function resetOperation() {
  deviceStatus.value.operationPrev = deviceStatus.value.operation;
  deviceStatus.value.operation = null;
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
    delete sc.screenNumber;
    socket.emit(TOPIC_DEVICE_STATUS, sc);
  });

  socket.on(TOPIC_DEVICE_DATA_FEED_UPDATE, ({ sensorExperiment, heaterExperiment, rgbExperiment }: DeviceDataFeedUpdate) => {    
    let rgbCalibratedAndTested = deviceStatus.value.rgbCalibratedAndTested;
    deviceStatus.value.rgbCalibratedAndTested = false;

    if (sensorExperiment === 0 || sensorExperiment === 2) {
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

    if (sensorExperiment === 1 || sensorExperiment === 2) {
      experimentActive = true;
      const { sensorConnected, setupData } = deviceStatus.value;

      const dataRate = setupData.dataRate === 'user' ? 1 : setupData.dataRate;
      const dataRateMs = dataRate * 1000;

      const obs1 = timer(0, dataRateMs);
      const obs2 = concat(timer(0, dataRateMs).pipe(take(setupData.dataSample as number)), of(-1).pipe(delay(1000)));
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

          const data: SensorDataStream = {
            temperature,
            temperatureIndex: temperature === null ? null : temperatureLog.length,
            voltage,
            voltageIndex: voltage === null ? null : voltageLog.length,
          };
          sensorDataStream.next(data);
        }
      });

      if (sensorConnected === 'temperature') {
        setOperation('measure_temperature');
      } else if (sensorConnected === 'voltage') {
        setOperation('measure_voltage');
      }

      deviceStatus.next(deviceStatus.value);
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

      if (heaterConnected === 'element') {
        setOperation('heater_control');
      } else if (heaterConnected === 'probe') {
        setOperation('heater_probe');
      }

      deviceStatus.next(deviceStatus.value);
    }

    if (rgbExperiment === true) {
      const { rgbConnected, rgbCalibrated } = deviceStatus.value;

      if (rgbCalibrated && rgbConnected === 'calibrate_test') {
        experimentActive = true;
        // const source = concat(timer(0, 1000).pipe(take(3)), of(-1).pipe(delay(1000)));
        const source = concat(timer(0, 1000).pipe(take(2)), of(-1).pipe(delay(1000)));

        subsX3 = source.subscribe((value) => {
          if (value < 0) {
            resetRgbDataStream(true);
          } else {
            let calibrateTest = rgbDataStream.value?.calibrateTest || [null, null, null];

            // if (value === 0) calibrateTest[value] = 0;
            // if (value === 1) calibrateTest[value] = -0.1;
            // if (value === 2) calibrateTest[value] = 0.2;
            if (value === 0) {
              calibrateTest = [null, null, null];
            } else if (value === 1) {
              calibrateTest = [0, -0.1, 0.2];
            }

            const data: RgbDataStream = { calibrateTest, measure: null };
            rgbDataStream.next(data);
          }
        });

        setOperation('rgb_calibrate');
        deviceStatus.value.rgbCalibratedAndTested = true;
      } else if (rgbConnected === 'measure') {
        experimentActive = true;
        // const source = concat(timer(0, 1000).pipe(take(3)), of(-1).pipe(delay(1000)));
        const source = concat(timer(0, 1000).pipe(take(2)), of(-1).pipe(delay(1000)));

        subsX3 = source.subscribe((value) => {
          if (value < 0) {
            resetRgbDataStream();
          } else {
            const calibrateTest = rgbDataStream.value?.calibrateTest || null;
            let measure = rgbDataStream.value?.measure || [null, null, null];

            // if (value === 0) measure[value] = 1.37;
            // if (value === 1) measure[value] = 0.36;
            // if (value === 2) measure[value] = 3.46;
            if (value === 0) {
              measure = [null, null, null];
            } else if (value === 1) {
              measure = [1.37, 0.36, 3.46];
            }

            const data: RgbDataStream = { calibrateTest, measure };
            rgbDataStream.next(data);
          }
        });

        setOperation('rgb_measure');
        deviceStatus.value.rgbCalibratedAndTested = rgbCalibratedAndTested;
      }

      deviceStatus.next(deviceStatus.value);
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

  socket.on(TOPIC_CLIENT_CHANNEL, ({ requestId, temperatureIndex, voltageIndex, getScreenNumber }: ClientChannelRequest, callback) => {
    const clientChannelResp: ClientChannelResponse = {
      requestId,
      temperatureLog: null,
      voltageLog: null,
      screenNumber: null,
    };
    if (typeof temperatureIndex === 'number' && temperatureIndex >= 0) {
      clientChannelResp.temperatureLog = deviceStatus.value.temperatureLog.slice(0, temperatureIndex);
    } else if (typeof voltageIndex === 'number' && voltageIndex >= 0) {
      clientChannelResp.voltageLog = deviceStatus.value.voltageLog.slice(0, voltageIndex);
    } else if (getScreenNumber === true) {
      clientChannelResp.screenNumber = deviceStatus.value.screenNumber;
    }

    // Acknowledgement: Sent to only the client that initiated the communication
    callback(clientChannelResp);
  });

  const subs3 = timer(0, 1000).subscribe((value) => {
    const batteryLevel = 70 + Math.floor(value / 10) % 10;
    if (deviceStatus.value.batteryLevel !== batteryLevel) {
      deviceStatus.value.batteryLevel = batteryLevel;
    }

    deviceStatus.next(deviceStatus.value);
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
        resetSensorDataStream();  // reset sensor stream
        resetHeaterDataStream();  // reset heater stream
        resetRgbDataStream();     // reset spectrophotometer stream
      });
    });
  } else if (clientType === 'member') {
    updateDeviceStatus({ memberUnjoin: clientId });  // remove client
  }
};
