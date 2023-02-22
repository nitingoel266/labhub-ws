import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import errorHandler from './utils/error-handler';
import indexHandler from './api';
import { initSetup } from './utils/setup';

dotenv.config();

const PORT = process.env.PORT || 4000;
// const isProd = process.env.NODE_ENV === 'production';

const app: Application = express();
const httpServer = createServer(app);

// remove x-powered-by header
app.disable('x-powered-by');

// disable cache
app.disable('etag');

// send formatted json
app.set('json spaces', 2);

// use application/json parser
app.use(express.json());

// add CORS headers
app.use(cors());

// -----------------------------

app.get('/', errorHandler(indexHandler));

// -----------------------------

const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  }
});

io.on('connection', (socket) => {
  // console.log('>>', socket.connected, socket.id);

  socket.on('disconnect', (reason) => {
    // console.log('~~', reason);
  });

  initSetup(socket);
});

// -----------------------------

httpServer.listen(PORT, () => {
  console.log(chalk.green(`API server running at port ${PORT}`));
});

// catches uncaught exceptions
process.on('uncaughtException', err => {
  console.error(chalk.red('[uncaughtException] API Server:'), err);
});
