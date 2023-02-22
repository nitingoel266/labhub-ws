import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { TOPIC_CLIENT, TOPIC_SERVER } from './const';

export const initSetup = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
  socket.on(TOPIC_CLIENT, (arg) => {
    console.log('==>', arg);
  });

  socket.emit(TOPIC_SERVER, 'from-server');
};
