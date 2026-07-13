# 作业管理系统后端

## 技术栈

- Node.js + Express
- Prisma ORM
- MySQL 数据库
- JWT 认证

## 前置要求

1. 安装 Node.js (v16 或更高版本)
2. 安装 MySQL 数据库 (v8.0 或更高版本)

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

1. 创建 MySQL 数据库：

```sql
CREATE DATABASE homework_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 修改 `.env` 文件中的数据库连接信息：

```
DATABASE_URL="mysql://用户名:密码@localhost:3306/homework_db"
```

### 3. 初始化数据库

```bash
npm run db:generate
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3001 启动

## API 接口

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 健康检查

- `GET /health` - 检查服务器状态

## 项目结构

```
server/
├── src/
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── routes/         # 路由
│   ├── utils/          # 工具函数
│   └── index.ts        # 入口文件
├── prisma/
│   └── schema.prisma   # Prisma 数据模型
├── package.json
└── tsconfig.json
```
