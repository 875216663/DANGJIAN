# 中英人寿智慧党务人员管理系统

当前目录是一个可直接打开的前端成品，聚焦“人员管理”，包含：

- 登录系统
- 角色分空间
- 党员管理
- 党支部管理
- 审批中心
- 账号与权限
- 个人中心

## 直接打开

- 双击 `open-app.command`
- 或直接打开 `index.html`

## 本地预览

```bash
cd /Users/caofei/Desktop/coze版本党建/source/projects/preview
./start-preview.sh
```

然后访问：

`http://127.0.0.1:4173`

## 演示账号

- 党委领导：`leader01` / `123456`
- 党建纪检部：`dept01` / `123456`
- 党支部书记/委员：`branch01` / `123456`
- 普通党员：`member01` / `123456`

## 数据说明

- 数据默认保存在浏览器 `localStorage`
- 支持在页面内导出本地数据
- 支持恢复演示数据

## 公网发布脚本

已提供：

```bash
./deploy-public.sh
```

该脚本会：

1. 启动本地静态站点
2. 下载 `cloudflared`
3. 建立 Cloudflare Quick Tunnel

注意：

- 当前这台机器的终端环境如果无法访问外网，会导致公网发布失败
- 失败时项目本身不受影响，仍可本地打开和运行
