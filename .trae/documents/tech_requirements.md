# StarClass AI 智能体升级项目 - 技术需求文档

## 1. 项目概述

### 1.1 现状分析

当前 StarClass 是一个基于 Node.js + Express + SQLite + Prisma 的在线作业管理系统，包含以下核心模块：
- 用户认证与角色管理（学生/教师）
- 班级管理
- 作业发布与提交
- 作业批改与评分
- 学生统计与等级系统
- 聊天功能
- 商店系统
- 基础 AI 聊天（通过阿里云通义千问）

### 1.2 升级目标

将现有系统升级为 AI 原生教育平台，引入多智能体协作系统，实现以下目标：
- 智能助教 Agent：自动批改作业、生成反馈、答疑解惑
- 学习辅导 Agent：个性化学习路径规划、知识点讲解、练习推荐
- 创意写作 Agent：辅助学生进行作文创作、故事编写
- 代码辅导 Agent：编程类作业的代码分析、错误诊断、优化建议
- RAG 知识库：基于教材、课件、作业历史构建智能问答
- MCP 工具生态：接入外部工具（题库、在线评测、知识检索）

### 1.3 技术栈变更

| 类别 | 原技术栈 | 新技术栈 |
|------|----------|----------|
| 后端语言 | Node.js | Python 3.11+ |
| Web 框架 | Express | FastAPI |
| 数据库 | SQLite (Prisma) | MySQL |
| AI 框架 | 原生 HTTP 调用 | LangChain v1 + LangGraph |
| 向量存储 | 无 | Pinecone / Chroma |
| 前端框架 | React + Vite | React + Vite + Three.js |

---

## 2. 后端架构设计

### 2.1 项目结构

```
backend/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── core/                   # 核心配置
│   │   ├── config.py           # 环境配置
│   │   ├── database.py         # 数据库连接
│   │   └── security.py         # 安全相关
│   ├── models/                 # SQLAlchemy 模型
│   │   ├── user.py
│   │   ├── class_.py
│   │   ├── homework.py
│   │   ├── submission.py
│   │   ├── agent.py
│   │   ├── chat.py
│   │   └── knowledge.py
│   ├── schemas/                # Pydantic 模式
│   │   ├── auth.py
│   │   ├── homework.py
│   │   ├── agent.py
│   │   └── chat.py
│   ├── routers/                # API 路由
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── classes.py
│   │   ├── homeworks.py
│   │   ├── submissions.py
│   │   ├── agents.py
│   │   └── chat.py
│   ├── services/               # 业务逻辑
│   │   ├── auth_service.py
│   │   ├── homework_service.py
│   │   └── submission_service.py
│   ├── agents/                 # AI 智能体核心
│   │   ├── __init__.py
│   │   ├── base.py             # 智能体基类
│   │   ├── registry.py         # 智能体注册中心
│   │   ├── llm_factory.py      # LLM 工厂
│   │   ├── memory/             # 记忆模块
│   │   │   ├── __init__.py
│   │   │   ├── short_term.py   # 短期记忆
│   │   │   └── long_term.py    # 长期记忆
│   │   ├── tools/              # 工具定义
│   │   │   ├── __init__.py
│   │   │   ├── mcp_base.py     # MCP 工具基类
│   │   │   ├── knowledge_search.py
│   │   │   ├── homework_tool.py
│   │   │   ├── code_analysis.py
│   │   │   └── web_search.py
│   │   ├── graphs/             # LangGraph 状态图
│   │   │   ├── __init__.py
│   │   │   ├── teaching_assistant.py
│   │   │   ├── study_coach.py
│   │   │   ├── creative_writer.py
│   │   │   └── code_coach.py
│   │   ├── rag/                # RAG 管道
│   │   │   ├── __init__.py
│   │   │   ├── loader.py
│   │   │   ├── splitter.py
│   │   │   ├── embedder.py
│   │   │   ├── retriever.py
│   │   │   └── pipeline.py
│   │   └── orchestrator.py     # 智能体编排器
│   └── utils/                  # 工具函数
│       ├── jwt.py
│       ├── logger.py
│       └── helpers.py
├── migrations/                 # 数据库迁移
│   ├── 0001_init.py
│   └── 0002_add_agent_tables.py
├── tests/                      # 测试
├── pyproject.toml
├── requirements.txt
└── .env
```

### 2.2 数据库设计

#### 2.2.1 现有表迁移（映射自 Prisma）

**users 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 UUID |
| email | VARCHAR(255) | 邮箱，唯一 |
| password | VARCHAR(255) | 加密密码 |
| name | VARCHAR(100) | 姓名 |
| nickname | VARCHAR(100) | 昵称 |
| avatar | VARCHAR(500) | 头像 URL |
| role | VARCHAR(20) | 角色：student/teacher/admin |
| class_id | VARCHAR(36) | 所属班级 |
| student_id | VARCHAR(50) | 学号 |
| stars | INT | 星星数量 |
| level | INT | 等级 |
| theme | VARCHAR(50) | 主题 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**classes 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| name | VARCHAR(100) | 班级名称 |
| class_code | VARCHAR(10) | 班级码，唯一 |
| teacher_id | VARCHAR(36) | 教师 ID |
| created_at | DATETIME | 创建时间 |

**homeworks 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| title | VARCHAR(200) | 作业标题 |
| description | TEXT | 作业描述 |
| due_date | DATETIME | 截止日期 |
| subject | VARCHAR(50) | 科目 |
| class_id | VARCHAR(36) | 班级 ID |
| teacher_id | VARCHAR(36) | 教师 ID |
| created_at | DATETIME | 创建时间 |

**submissions 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| homework_id | VARCHAR(36) | 作业 ID |
| student_id | VARCHAR(36) | 学生 ID |
| content | TEXT | 提交内容 |
| file_url | VARCHAR(500) | 文件 URL |
| status | VARCHAR(20) | 状态：pending/submitted/graded |
| grade | INT | 分数 |
| feedback | TEXT | 教师反馈 |
| ai_feedback | TEXT | AI 生成反馈 |
| created_at | DATETIME | 创建时间 |

#### 2.2.2 新增 AI 相关表

**agents 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| name | VARCHAR(100) | 智能体名称 |
| type | VARCHAR(50) | 类型：teaching_assistant/study_coach/creative_writer/code_coach |
| description | TEXT | 描述 |
| system_prompt | TEXT | 系统提示词 |
| is_active | BOOLEAN | 是否启用 |
| model_name | VARCHAR(100) | 关联模型 |
| created_at | DATETIME | 创建时间 |

**agent_conversations 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| user_id | VARCHAR(36) | 用户 ID |
| agent_id | VARCHAR(36) | 智能体 ID |
| class_id | VARCHAR(36) | 班级 ID（可选） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**agent_messages 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| conversation_id | VARCHAR(36) | 会话 ID |
| role | VARCHAR(20) | 角色：user/assistant/system/tool |
| content | TEXT | 消息内容 |
| tool_call | JSON | 工具调用信息 |
| tool_result | JSON | 工具执行结果 |
| created_at | DATETIME | 创建时间 |

**knowledge_base 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| class_id | VARCHAR(36) | 班级 ID |
| title | VARCHAR(200) | 文档标题 |
| content | TEXT | 文档内容 |
| source_type | VARCHAR(50) | 来源类型：upload/crawler/chat |
| source_url | VARCHAR(500) | 来源 URL |
| embedding_vector | JSON | 向量表示（或外部存储） |
| created_at | DATETIME | 创建时间 |

**agent_tool_calls 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| message_id | VARCHAR(36) | 消息 ID |
| tool_name | VARCHAR(100) | 工具名称 |
| tool_params | JSON | 工具参数 |
| tool_result | JSON | 工具结果 |
| status | VARCHAR(20) | 状态：success/failed |
| created_at | DATETIME | 创建时间 |

---

## 3. AI 智能体架构设计

### 3.1 Harness Agent 模式参考

采用分层架构：
1. **Orchestration Layer**（编排层）：管理智能体调度、路由、状态
2. **Agent Registry**（注册中心）：智能体注册、发现、配置管理
3. **Memory Layer**（记忆层）：短期对话记忆 + 长期用户记忆
4. **Tool Registry**（工具注册）：工具定义、权限控制、执行引擎
5. **Planning Layer**（规划层）：任务分解、多步骤推理

### 3.2 智能体定义

#### 3.2.1 智能助教 Agent (TeachingAssistant)

**角色定位**：辅助教师批改作业、生成反馈

**核心能力**：
- 作业自动批改（选择题、填空题、判断题）
- 作文评分与评语生成
- 作业质量分析报告
- 常见错误统计

**工具**：
- `grade_homework(submission_id, criteria)` - 批改作业
- `generate_feedback(submission_id)` - 生成反馈
- `analyze_errors(class_id, subject)` - 分析常见错误

#### 3.2.2 学习辅导 Agent (StudyCoach)

**角色定位**：个性化学习辅导

**核心能力**：
- 知识点讲解
- 学习路径规划
- 练习推荐
- 错题分析
- 学习进度跟踪

**工具**：
- `explain_topic(topic, grade_level)` - 讲解知识点
- `plan_learning_path(student_id, goal)` - 规划学习路径
- `recommend_exercises(student_id, topic)` - 推荐练习
- `analyze_mistakes(student_id, subject)` - 分析错题

#### 3.2.3 创意写作 Agent (CreativeWriter)

**角色定位**：激发创意、辅助写作

**核心能力**：
- 故事创作
- 作文构思
- 写作技巧指导
- 润色修改

**工具**：
- `generate_story(prompt, genre, length)` - 生成故事
- `brainstorm_ideas(topic, count)` - 头脑风暴
- `polish_writing(content, style)` - 润色文章

#### 3.2.4 代码辅导 Agent (CodeCoach)

**角色定位**：编程学习助手

**核心能力**：
- 代码分析
- 错误诊断
- 代码优化建议
- 编程题解答

**工具**：
- `analyze_code(code, language)` - 分析代码
- `debug_code(code, error_message)` - 调试代码
- `optimize_code(code, language)` - 优化代码
- `solve_problem(problem_description)` - 解答编程题

### 3.3 LangGraph 状态图设计

#### 3.3.1 通用状态定义

```python
from typing import TypedDict, List, Optional
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    messages: List[BaseMessage]           # 对话消息历史
    agent_info: dict                      # 智能体配置信息
    user_context: dict                   # 用户上下文（角色、班级、学习进度）
    tool_calls: List[dict]               # 待执行的工具调用
    tool_results: List[dict]             # 工具执行结果
    final_answer: Optional[str]          # 最终回答
    is_complete: bool                    # 是否完成
```

#### 3.3.2 节点定义

```python
class AgentNodes:
    def __init__(self, agent):
        self.agent = agent
    
    async def call_agent(self, state: AgentState) -> AgentState:
        """调用智能体主逻辑"""
        pass
    
    async def select_tool(self, state: AgentState) -> AgentState:
        """选择并调用工具"""
        pass
    
    async def summarize(self, state: AgentState) -> AgentState:
        """总结回答"""
        pass
    
    async def check_complete(self, state: AgentState) -> str:
        """检查是否完成，返回下一个节点名称"""
        pass
```

#### 3.3.3 图结构

```text
[START] → [call_agent] → [select_tool?]
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
               [工具调用]           [直接回答]
                    │                   │
                    └─────────┬─────────┘
                              ↓
                        [summarize] → [check_complete] → [END]
                                           │
                                           ↓ (继续)
                                    [call_agent]
```

### 3.4 MCP 工具设计

#### 3.4.1 MCP 工具基类

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class MCPTool(ABC):
    name: str
    description: str
    parameters: Dict[str, Any]
    
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """执行工具"""
        pass
    
    def get_schema(self) -> Dict[str, Any]:
        """获取工具 Schema"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }
```

#### 3.4.2 内置工具列表

| 工具名称 | 说明 | 参数 | 返回值 |
|----------|------|------|--------|
| `knowledge_search` | 搜索知识库 | query, class_id | 相关文档片段 |
| `homework_tool` | 作业操作 | action, homework_id | 作业信息 |
| `code_analysis` | 代码分析 | code, language | 分析结果 |
| `web_search` | 网页搜索 | query | 搜索结果 |
| `grade_calculator` | 成绩计算 | submission_id | 评分结果 |
| `user_profile` | 用户信息 | user_id | 用户资料 |
| `class_info` | 班级信息 | class_id | 班级详情 |

### 3.5 RAG 架构设计

#### 3.5.1 数据管道

```text
[数据源] → [Loader] → [Splitter] → [Embedder] → [VectorStore] → [Retriever]
    ↑                                                    │
    └───────────────── [Query] ← [LLM] ← ────────────────┘
```

#### 3.5.2 组件设计

**Loader 层**：
- `FileLoader`: PDF、Word、Markdown 文件加载
- `URLoader`: 网页内容抓取
- `ChatLoader`: 历史聊天记录导入
- `HomeworkLoader`: 作业文档加载

**Splitter 层**：
- `RecursiveCharacterTextSplitter`: 递归文本分割
- `MarkdownHeaderTextSplitter`: Markdown 标题分割
- 支持自定义 chunk size（建议 500-1000 tokens）

**Embedder 层**：
- 使用 OpenAI Embedding 或开源模型（如 BGE）
- 向量维度：1536 (text-embedding-3-small)

**VectorStore**：
- 推荐：Pinecone（云端）或 Chroma（本地）
- 支持按班级隔离索引

**Retriever 层**：
- `SimilarityRetriever`: 相似度检索
- `MaxMarginalRelevanceRetriever`: MMR 检索（避免重复）
- 检索数量：3-5 个文档

---

## 4. API 接口设计

### 4.1 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/register | 用户注册 |
| GET | /api/auth/me | 获取当前用户 |
| POST | /api/auth/logout | 登出 |

### 4.2 智能体接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/agents | 获取智能体列表 |
| GET | /api/agents/{agent_id} | 获取智能体详情 |
| POST | /api/agents/{agent_id}/chat | 与智能体对话 |
| GET | /api/agents/{agent_id}/conversations | 获取会话列表 |
| GET | /api/agents/{agent_id}/conversations/{conv_id} | 获取会话详情 |
| DELETE | /api/agents/{agent_id}/conversations/{conv_id} | 删除会话 |

### 4.3 知识库接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/knowledge | 获取知识库列表 |
| POST | /api/knowledge | 上传文档 |
| GET | /api/knowledge/{doc_id} | 获取文档详情 |
| DELETE | /api/knowledge/{doc_id} | 删除文档 |
| POST | /api/knowledge/search | 搜索知识库 |
| POST | /api/knowledge/reindex | 重新索引 |

### 4.4 作业接口（扩展 AI 能力）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/homeworks/{hw_id}/ai-grade | AI 自动批改 |
| POST | /api/homeworks/{hw_id}/ai-feedback | AI 生成反馈 |
| GET | /api/homeworks/{hw_id}/ai-analysis | AI 分析报告 |

### 4.5 实时通信

使用 WebSocket 实现实时聊天：
- `/ws/agents/{agent_id}` - 智能体对话
- `/ws/class/{class_id}` - 班级群聊

---

## 5. 前端优化设计

### 5.1 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript | 现有框架 |
| 构建工具 | Vite | 现有工具 |
| 状态管理 | Zustand | 轻量级状态管理 |
| UI 组件 | Radix UI | 无障碍组件 |
| 3D 渲染 | Three.js + @react-three/fiber | 3D 效果 |
| 动画 | Framer Motion | 流畅动画 |
| 图表 | Recharts | 数据可视化 |

### 5.2 页面优化方案

#### 5.2.1 登录页

- 添加 Three.js 3D 星空背景效果
- 浮动的星星/书本/铅笔等教育元素
- 渐入动画效果

#### 5.2.2 学生工作台

- 3D 等级展示（奖杯、星星）
- 能力雷达图 3D 化
- 学习进度可视化（3D 进度条）

#### 5.2.3 智能体对话页

- 智能体头像 3D 展示
- 消息气泡浮动动画
- 工具调用可视化（流程图）

#### 5.2.4 教室页面

- 虚拟教室场景（Three.js）
- 学生座位展示
- 互动元素

### 5.3 Three.js 组件设计

```
src/components/three/
├── StarField.tsx          # 星空背景
├── FloatingObjects.tsx    # 浮动元素
├── Trophy3D.tsx           # 3D 奖杯
├── RadarChart3D.tsx       # 3D 雷达图
├── ClassroomScene.tsx     # 教室场景
└── AgentAvatar3D.tsx      # 智能体 3D 头像
```

### 5.4 设计风格

- **主色调**：深蓝色 (#1a1a2e) + 金色 (#ffd700) + 紫色 (#8b5cf6)
- **风格**：科技感、教育感、温馨
- **动画**：平滑过渡、浮动效果、粒子效果

---

## 6. 部署架构

### 6.1 环境要求

| 服务 | 版本 |
|------|------|
| Python | 3.11+ |
| MySQL | 8.0+ |
| Redis | 7.0+（用于缓存和会话） |
| VectorDB | Pinecone / Chroma |

### 6.2 Docker 部署

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=mysql+pymysql://user:pass@db:3306/starclass
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
  
  db:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=starclass
  
  redis:
    image: redis:7.0
    volumes:
      - redis_data:/data

  frontend:
    build: ./
    ports:
      - "3000:3000"
```

---

## 7. 安全考虑

### 7.1 认证与授权

- JWT Token 认证
- 角色权限控制（学生/教师/管理员）
- 智能体操作审计日志

### 7.2 数据安全

- 密码使用 bcrypt 加密
- 敏感配置使用环境变量
- HTTPS 传输加密
- SQL 注入防护（SQLAlchemy 参数化查询）

### 7.3 智能体安全

- 工具调用权限控制
- 输出内容审核（敏感信息过滤）
- 防止 Prompt 注入攻击
- 资源使用限制（Token 配额）

---

## 8. 实施计划

### Phase 1：后端迁移（1-2 周）

- [ ] 创建 Python/FastAPI 项目结构
- [ ] MySQL 数据库设计与迁移
- [ ] 用户认证模块
- [ ] 班级管理模块
- [ ] 作业管理模块

### Phase 2：智能体核心（2-3 周）

- [ ] LangChain/LangGraph 集成
- [ ] 智能体基类与注册中心
- [ ] 记忆模块实现
- [ ] 智能助教 Agent
- [ ] 学习辅导 Agent

### Phase 3：RAG 与 MCP（2-3 周）

- [ ] 向量数据库集成
- [ ] RAG 管道实现
- [ ] MCP 工具框架
- [ ] 内置工具开发
- [ ] 创意写作 Agent
- [ ] 代码辅导 Agent

### Phase 4：前端升级（2-3 周）

- [ ] Three.js 3D 组件
- [ ] 智能体对话界面
- [ ] 知识库管理界面
- [ ] 性能优化
- [ ] 响应式适配

### Phase 5：测试与部署（1 周）

- [ ] 单元测试
- [ ] 集成测试
- [ ] Docker 部署
- [ ] 上线验证

---

## 9. 依赖清单

### 核心依赖

| 包名 | 版本 | 说明 |
|------|------|------|
| fastapi | 0.115+ | Web 框架 |
| uvicorn | 0.30+ | ASGI 服务器 |
| sqlalchemy | 2.0+ | ORM |
| pymysql | 1.1+ | MySQL 驱动 |
| python-jose | 3.3+ | JWT |
| bcrypt | 4.1+ | 密码加密 |
| langchain | 0.3+ | AI 框架 |
| langchain-openai | 0.1+ | OpenAI 集成 |
| langgraph | 0.2+ | 状态图 |
| pinecone-client | 5.0+ | 向量数据库 |
| chromadb | 0.4+ | 本地向量库 |
| python-dotenv | 1.0+ | 环境变量 |

### 前端依赖

| 包名 | 版本 | 说明 |
|------|------|------|
| three | 0.160+ | 3D 渲染 |
| @react-three/fiber | 8.15+ | React 集成 |
| @react-three/drei | 9.100+ | 3D 组件库 |
| framer-motion | 11.0+ | 动画 |
| zustand | 4.5+ | 状态管理 |
| radix-ui/react-* | 1.0+ | UI 组件 |
| recharts | 2.10+ | 图表 |
| lucide-react | 0.300+ | 图标 |