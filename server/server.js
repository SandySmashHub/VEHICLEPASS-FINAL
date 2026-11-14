import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { corsOptions, validateEnv } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initSocket } from './socket/index.js';
import { startScheduler } from './services/scheduler.js';

validateEnv();

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy; needed for rate limiting by real IP
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '200kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

const port = process.env.PORT || 5000;
let timer;

connectDB()
  .then(() => {
    server.listen(port, () => console.log(`VehiclePass API listening on port ${port}`));
    timer = startScheduler();
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

const shutdown = () => {
  clearInterval(timer);
  server.close(() => mongoose.connection.close(false).then(() => process.exit(0)));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
