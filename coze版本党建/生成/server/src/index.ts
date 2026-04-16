import express from 'express';
import cors from 'cors';
import { isOriginAllowed } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';
import { auditMiddleware } from './middlewares/audit.middleware';
import { env } from './config/env';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import membersRouter from './routes/members';
import branchesRouter from './routes/branches';
import noticesRouter from './routes/notices';
import meetingsRouter from './routes/meetings';
import studyRouter from './routes/study';
import healthRouter from './routes/health';
import { logger } from './utils/logger';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    credentials: false,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(requestLogger);
app.use(auditMiddleware);

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/members', membersRouter);
app.use('/api/v1/branches', branchesRouter);
app.use('/api/v1/notices', noticesRouter);
app.use('/api/v1/meetings', meetingsRouter);
app.use('/api/v1/study', studyRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Server listening at http://localhost:${env.PORT}/`);
});
