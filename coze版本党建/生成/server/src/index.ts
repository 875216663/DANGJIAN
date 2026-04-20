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

// 统一配置跨域、请求体解析以及请求日志/审计中间件。
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

// 按业务域拆分路由，所有接口统一挂载到 /api/v1 下。
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/members', membersRouter);
app.use('/api/v1/branches', branchesRouter);
app.use('/api/v1/notices', noticesRouter);
app.use('/api/v1/meetings', meetingsRouter);
app.use('/api/v1/study', studyRouter);

// 兜底 404 和统一错误处理，避免异常直接暴露给客户端。
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Server listening at http://localhost:${env.PORT}/`);
});
