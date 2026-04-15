# 党建系统交付说明

## 正式架构

- 前端：`生成/client`
- 后端：`生成/server`
- 数据库：Neon Postgres
- 前端部署：Vercel
- 后端部署：Railway

## 数据持久化

后端已支持：

- 存在 `DATABASE_URL` 时优先写入 PostgreSQL
- 未配置数据库时回退到本地 `data/local-db.json`
- 首次连库时自动读取现有本地数据并初始化到数据库

## 前端部署

Vercel 项目建议：

- Repository：`875216663/DANGJIAN`
- Root Directory：`coze版本党建/生成/client`
- `vercel.json` 已内置：
  - `installCommand`: `corepack enable && pnpm install --dir .. --frozen-lockfile`
  - `buildCommand`: `pnpm run build:web`
  - `outputDirectory`: `dist`
- 说明：
  - `client` 是 `生成` workspace 子包
  - 前端部署必须由上层 workspace 安装依赖，不能只在 `client` 目录单独执行 `npm install`
  - 若只装子包依赖，Expo/Metro 会在构建时找不到 `生成/node_modules`
  - 已移除 `client` 中会在云端动态安装依赖的 `postinstall` 脚本，避免 Vercel 构建阶段卡死或改乱依赖树

前端环境变量：

- `EXPO_PUBLIC_BACKEND_BASE_URL`

## 后端部署

Railway 项目建议：

- Repository：`875216663/DANGJIAN`
- Root Directory：`coze版本党建/生成/server`
- 已提供 `Dockerfile` 和 `railway.json`

后端环境变量：

- `DATABASE_URL`
- `DB_SSL=false` 或留空（推荐 Neon 仅使用 `DATABASE_URL`）
- `DB_SSL_REJECT_UNAUTHORIZED=false`
- `PORT=5000`

## 数据库

Neon 推荐直接使用标准连接串：

- `DATABASE_URL=postgresql://...`

## 健康检查

后端启动后可访问：

- `/api/v1/health`

返回值中的 `storage` 字段：

- `database` 代表已成功切换到数据库
- `local-file` 代表仍在使用本地文件
