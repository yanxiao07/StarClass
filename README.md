# ⭐ StarClass 星学园 - AI 原生智能教育平台

一款面向教师与学生的 AI 原生项目协作平台，通过多智能体系统实现个性化学习辅导、智能作业批改、创意写作辅助与代码辅导，让 AI 真正成为教学团队的一员。

---

## 📋 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [AI 智能体系统](#ai-智能体系统)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目简介

StarClass 星学园是一款**AI 原生**的智能教育协作平台，致力于通过 AI Agent 技术革新传统教育方式。

### 核心价值

- 🤖 **多智能体协作**：智能助教、学习辅导、创意写作、代码辅导四大 AI 助手协同工作
- 📚 **RAG 知识库**：基于教材、课件、作业历史构建的智能问答系统
- 🔄 **自动化工作流**：作业自动批改、学习路径规划、个性化练习推荐
- 🌐 **全平台支持**：Web 端、桌面端、移动端多端适配
- 🎨 **沉浸式体验**：Three.js 3D 视觉效果，打造科技感学习环境

### 目标用户

| 用户角色 | 使用场景 | 核心价值 |
|----------|----------|----------|
| 👨‍🏫 教师 | 作业批改、班级管理 | AI 助教自动批改，节省时间 |
| 👨‍🎓 学生 | 学习辅导、作业完成 | 个性化学习路径，智能答疑 |
| 🛠️ 管理员 | 系统配置、权限管理 | 可视化管理后台 |

### 项目演进

> **重要说明**：项目正在从 Node.js 后端迁移到 Python/FastAPI 后端。当前项目包含两个后端：
> - `backend/` — **新 Python/FastAPI 后端**（推荐使用），包含完整的 AI Agent 系统
> - `server/` — **旧 Node.js/Express 后端**（遗留版本），保留原有作业管理功能

---

## 核心功能

### 📱 用户端功能

#### 教师工作台
- 创建与管理班级
- 布置作业（支持截止日期、科目分类）
- AI 自动批改作业并生成反馈
- 查看学生能力雷达图
- 班级实时聊天管理

#### 学生工作台
- 查看与提交作业（文字/图片/文件）
- 作业批改结果与 AI 反馈查看
- 个人能力六芒星图与等级系统
- AI 智能体对话（学习辅导、创意写作、代码辅导）
- 星星商城（虚拟货币兑换）

### 🤖 AI 智能体功能

详细功能见 [AI 智能体系统](#ai-智能体系统)

### 🎨 视觉效果

- Three.js 3D 星空背景
- 浮动教育元素动画（书本、铅笔、星星）
- 虚拟教室场景展示
- 响应式设计，支持多端

---

## AI 智能体系统

### 智能体架构

```
┌─────────────────────────────────────────────────────┐
│                   Agent Orchestrator                │
│                    (智能体编排器)                    │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Teaching  │  │   Study     │  │   Creative  │
│  Assistant  │  │    Coach    │  │    Writer   │
│  (智能助教)  │  │  (学习辅导)  │  │  (创意写作)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
│ Code Coach  │  │  MCP Tools  │  │   RAG KB    │
│  (代码辅导)  │  │  (工具系统)  │  │  (知识库)   │
└─────────────┘  └─────────────┘  └─────────────┘
```

### 内置智能体

| 智能体 | 类型 | 核心能力 | 适用场景 |
|--------|------|----------|----------|
| 📝 智能助教 | `teaching_assistant` | 作业批改、反馈生成、错误分析 | 教师批改作业 |
| 🎓 学习辅导 | `study_coach` | 知识点讲解、学习路径规划、练习推荐 | 学生学习辅导 |
| ✍️ 创意写作 | `creative_writer` | 作文构思、故事创作、润色修改 | 语文写作教学 |
| 💻 代码辅导 | `code_coach` | 代码分析、错误诊断、优化建议 | 编程教学 |

### 智能体工作流程

```text
用户提问 → Agent Orchestrator → 选择智能体 → 执行任务
                                              │
                            ┌─────────────────┼─────────────────┐
                            ↓                 ↓                 ↓
                       调用工具           直接回答           RAG检索
                            │                                   │
                            └─────────────────┬─────────────────┘
                                              ↓
                                         返回结果
```

### MCP 工具系统

| 工具名称 | 功能说明 | 参数 |
|----------|----------|------|
| `knowledge_search` | 搜索知识库 | query, class_id |
| `homework_tool` | 作业操作 | action, homework_id |
| `code_analysis` | 代码分析 | code, language |

---

## 技术架构

### 技术栈

#### Python 后端（推荐）

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 开发语言 |
| FastAPI | 0.115+ | Web 框架 |
| SQLAlchemy | 2.0+ | ORM |
| MySQL | 8.0+ | 数据库 |
| LangChain | 0.3+ | AI 框架 |
| LangGraph | 0.2+ | 状态图编排 |
| LangChain OpenAI | 0.1+ | LLM 集成 |
| Pinecone / Chroma | - | 向量数据库（可选） |
| JWT | 3.3+ | 认证 |

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18+ | UI 框架 |
| TypeScript | 5.3+ | 类型安全 |
| Vite | 5.0+ | 构建工具 |
| Three.js | 0.160+ | 3D 渲染 |
| Tailwind CSS | 3.4+ | 样式 |
| Lucide React | 0.300+ | 图标 |

### 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                             │
│              React + TypeScript + Vite + Three.js                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │ HTTP/WebSocket
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend Layer (FastAPI)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Auth    │ │  Users   │ │ Classes  │ │Homeworks │ │ Agents   │ │
│  │  Router  │ │  Router  │ │  Router  │ │  Router  │ │  Router  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │            │            │            │            │        │
│       └────────────┴────────────┴────────────┴────────────┘        │
│                        ┌───────────────┐                           │
│                        │  Agent Core   │                           │
│                        │ (LangGraph)   │                           │
│                        └───────┬───────┘                           │
│                                │                                   │
│              ┌─────────────────┼─────────────────┐                 │
│              ↓                 ↓                 ↓                 │
│        ┌─────────┐      ┌─────────┐      ┌─────────┐              │
│        │  LLM    │      │  Tools  │      │  RAG    │              │
│        │ Factory │      │ Registry│      │ Pipeline│              │
│        └─────────┘      └─────────┘      └─────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         ↓                     ↓
                  ┌───────────┐         ┌───────────┐
                  │   MySQL   │         │   Chroma  │
                  │  (主库)   │         │ (向量库)   │
                  └───────────┘         └───────────┘
```

---

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+
- Git

### 使用 Python 后端（推荐）

#### 1. 克隆项目

```bash
git clone https://github.com/yanxiao07/StarClass.git
cd StarClass
```

#### 2. 配置 Python 后端

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和 API 密钥
```

#### 3. 初始化数据库

```bash
# 创建数据库表
python -m app.utils.init_db

# 初始化智能体数据
python -m app.utils.seed_data
```

#### 4. 启动 Python 后端

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务运行在 `http://localhost:8000`

#### 5. 配置前端

```bash
# 回到项目根目录
cd ..

# 安装前端依赖
npm install

# 配置环境变量（指向 Python 后端）
cp .env.example .env
# 编辑 .env 文件，设置 VITE_API_URL=http://localhost:8000
```

#### 6. 启动前端

```bash
npm run dev
```

前端服务运行在 `http://localhost:5173`

### 访问应用

打开浏览器访问 `http://localhost:5173`

### 使用旧版 Node.js 后端（遗留）

如需使用旧版 Node.js 后端，请查看 `server/README.md`。

---

## 项目结构

```
StarClass/
├── .trae/
│   └── documents/
│       └── tech_requirements.md    # 技术需求文档
├── backend/                        # Python/FastAPI 后端（推荐）
│   ├── app/
│   │   ├── core/                   # 核心配置
│   │   │   ├── config.py           # 环境配置
│   │   │   ├── database.py         # 数据库连接
│   │   │   └── security.py         # 安全认证
│   │   ├── models/                 # SQLAlchemy 模型
│   │   ├── schemas/                # Pydantic 模式
│   │   ├── routers/                # API 路由
│   │   ├── agents/                 # AI 智能体核心
│   │   │   ├── base.py             # 智能体基类
│   │   │   ├── registry.py         # 智能体注册中心
│   │   │   ├── llm_factory.py      # LLM 工厂
│   │   │   ├── orchestrator.py     # 智能体编排器
│   │   │   ├── memory/             # 记忆模块
│   │   │   ├── tools/              # MCP 工具
│   │   │   ├── graphs/             # LangGraph 状态图
│   │   │   └── rag/                # RAG 管道
│   │   ├── utils/                  # 工具函数
│   │   └── main.py                 # FastAPI 入口
│   ├── migrations/                 # 数据库迁移
│   ├── tests/                      # 测试文件
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── .env.example
├── src/                            # React 前端
│   ├── components/
│   │   ├── three/                  # Three.js 3D 组件
│   │   │   ├── StarField.tsx       # 星空背景
│   │   │   ├── FloatingObjects.tsx # 浮动元素
│   │   │   └── ClassroomScene.tsx  # 教室场景
│   │   └── StarDecoration.tsx      # 星星装饰
│   ├── features/
│   │   ├── auth/                   # 认证模块
│   │   ├── class/                  # 班级模块
│   │   ├── dashboard/              # 仪表板
│   │   ├── homework/               # 作业模块
│   │   ├── agents/                 # 智能体对话
│   │   │   └── AgentChat.tsx       # 智能体聊天界面
│   │   ├── store/                  # 商城模块
│   │   └── games/                  # 游戏模块
│   ├── services/                   # API 服务
│   ├── styles/                     # 样式文件
│   ├── types/                      # TypeScript 类型
│   ├── App.tsx
│   └── main.tsx
├── server/                         # Node.js/Express 后端（遗留版本）
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## API 文档

### 智能体 API

#### 获取智能体列表

```
GET /api/agents
```

#### 与智能体对话

```
POST /api/agents/{agent_id}/chat
Content-Type: application/json

{
  "message": "帮我讲解一下牛顿第二定律",
  "conversation_id": "可选，会话ID",
  "class_id": "可选，班级ID"
}
```

#### 获取会话历史

```
GET /api/agents/{agent_id}/conversations/{conv_id}
```

### 认证 API

```
POST /api/auth/login
POST /api/auth/register
GET /api/auth/me
```

### 作业 API

```
GET /api/homeworks
POST /api/homeworks
GET /api/homeworks/{id}
DELETE /api/homeworks/{id}
```

### 完整 API 文档

启动 Python 后端后访问 `http://localhost:8000/docs` 查看交互式 API 文档。

---

## 页面展示

### 登录页面

![Login Page](https://raw.githubusercontent.com/yanxiao07/StarClass/main/docs/screenshots/login.png)

### 学生工作台

![Student Dashboard](https://raw.githubusercontent.com/yanxiao07/StarClass/main/docs/screenshots/student-dashboard.png)

### 智能体对话

![Agent Chat](https://raw.githubusercontent.com/yanxiao07/StarClass/main/docs/screenshots/agent-chat.png)

### 作业管理

![Homework Management](https://raw.githubusercontent.com/yanxiao07/StarClass/main/docs/screenshots/homework-management.png)

### 3D 教室场景

![Classroom Scene](https://raw.githubusercontent.com/yanxiao07/StarClass/main/docs/screenshots/classroom-scene.png)

> **说明**：截图目录 `docs/screenshots/` 待补充实际截图。

---

## 贡献指南

### 开发流程

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交代码：`git commit -m "feat: add your feature"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范

- Python：遵循 PEP 8 规范
- TypeScript：遵循 ESLint 规范
- 提交信息：使用 Conventional Commits

### 测试

```bash
# 后端测试
cd backend
pytest

# 前端测试
npm test
```

---

## 许可证

MIT License

---

## 联系方式

如有问题或建议，欢迎提交 Issue 或联系开发者！

---

**⭐ StarClass - AI 让学习更智能 ⭐**