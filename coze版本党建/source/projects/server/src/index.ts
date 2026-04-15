import express from 'express';
import cors from 'cors';
import dashboardRouter from './routes/dashboard';
import membersRouter from './routes/members';
import branchesRouter from './routes/branches';
import noticesRouter from './routes/notices';
import meetingsRouter from './routes/meetings';
import studyRouter from './routes/study';
import { auditLog } from './middleware/audit';

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 审计日志中间件（所有API请求）
app.use(auditLog);

// 健康检查
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// API 路由
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/members', membersRouter);
app.use('/api/v1/branches', branchesRouter);
app.use('/api/v1/notices', noticesRouter);
app.use('/api/v1/meetings', meetingsRouter);
app.use('/api/v1/study', studyRouter);

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
