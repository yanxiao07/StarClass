from typing import Dict, Any, Optional
import uuid
from datetime import datetime

from app.models.agent import Agent, AgentConversation, AgentMessage
from app.models.user import User
from app.models.homework import Homework
from app.models.submission import Submission
from app.models.class_ import Class


class AgentOrchestrator:
    def __init__(self, db):
        self.db = db

    async def chat(self, user, agent: Agent, message: str,
                   conversation_id: Optional[str] = None,
                   class_id: Optional[str] = None,
                   homework_id: Optional[str] = None) -> Dict[str, Any]:
        if conversation_id:
            conversation = self.db.query(AgentConversation).filter(
                AgentConversation.id == conversation_id,
                AgentConversation.user_id == user.id,
            ).first()
            if not conversation:
                conversation = self._create_conversation(user, agent, class_id)
        else:
            conversation = self._create_conversation(user, agent, class_id)

        self._save_message(conversation.id, "user", message)

        user_context = self._build_user_context(user, class_id, homework_id)

        response = await self._invoke_agent(agent, message, user_context, user=user, class_id=class_id)

        self._save_message(conversation.id, "assistant", response.get("response", ""))

        conversation.updated_at = datetime.utcnow()
        self.db.commit()

        return {
            "conversationId": conversation.id,
            "agentId": agent.id,
            "response": response.get("response", ""),
            "toolResults": response.get("tool_results", []),
            "createdAt": datetime.utcnow().isoformat(),
        }

    def _create_conversation(self, user, agent: Agent, class_id: Optional[str]) -> AgentConversation:
        conversation = AgentConversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            agent_id=agent.id,
            class_id=class_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def _save_message(self, conversation_id: str, role: str, content: str,
                     tool_calls: Optional[Any] = None, tool_result: Optional[Any] = None):
        message = AgentMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_call=tool_calls,
            tool_result=tool_result,
            created_at=datetime.utcnow(),
        )
        self.db.add(message)
        self.db.commit()

    def _build_user_context(self, user, class_id: Optional[str],
                            homework_id: Optional[str] = None) -> Dict[str, Any]:
        """构建丰富的用户上下文，包含作业、提交、班级信息"""
        ctx = {
            "user_id": user.id,
            "name": user.name,
            "nickname": user.nickname,
            "role": user.role,
            "class_id": class_id or user.class_id,
            "stars": user.stars,
            "level": user.level,
        }

        # 班级信息
        if ctx["class_id"]:
            cls = self.db.query(Class).filter(Class.id == ctx["class_id"]).first()
            if cls:
                ctx["class_name"] = cls.name

        # 作业上下文
        if homework_id:
            hw = self.db.query(Homework).filter(Homework.id == homework_id).first()
            if hw:
                ctx["homework"] = {
                    "id": hw.id,
                    "title": hw.title,
                    "description": hw.description,
                    "subject": hw.subject,
                    "due_date": hw.due_date.isoformat() if hw.due_date else None,
                }

                # 如果是学生，查找该作业的提交
                if user.role == "student":
                    sub = self.db.query(Submission).filter(
                        Submission.homework_id == hw.id,
                        Submission.student_id == user.id,
                    ).first()
                    if sub:
                        ctx["submission"] = {
                            "id": sub.id,
                            "content": sub.content,
                            "status": sub.status,
                            "grade": sub.grade,
                            "feedback": sub.feedback,
                            "ai_feedback": sub.ai_feedback,
                        }

        # 教师上下文：班级学生和提交统计
        if user.role == "teacher" and ctx["class_id"]:
            students = self.db.query(User).filter(
                User.class_id == ctx["class_id"],
                User.role == "student",
            ).all()
            ctx["class_students_count"] = len(students)

            # 统计该教师所有作业的提交情况
            homeworks = self.db.query(Homework).filter(
                Homework.teacher_id == user.id
            ).all()
            ctx["teacher_homeworks"] = [
                {"id": h.id, "title": h.title, "subject": h.subject}
                for h in homeworks
            ]

            total_submissions = 0
            graded = 0
            for hw in homeworks:
                subs = self.db.query(Submission).filter(
                    Submission.homework_id == hw.id
                ).all()
                total_submissions += len(subs)
                graded += sum(1 for s in subs if s.status == "graded")
            ctx["submission_stats"] = {
                "total": total_submissions,
                "graded": graded,
                "pending": total_submissions - graded,
            }

        # 学生上下文：作业完成情况
        if user.role == "student":
            homeworks = self.db.query(Homework).filter(
                Homework.class_id == ctx["class_id"]
            ).all() if ctx["class_id"] else []

            total_hw = len(homeworks)
            submitted = 0
            graded = 0
            avg_grade = 0
            grade_count = 0

            for hw in homeworks:
                sub = self.db.query(Submission).filter(
                    Submission.homework_id == hw.id,
                    Submission.student_id == user.id,
                ).first()
                if sub:
                    submitted += 1
                    if sub.status == "graded" and sub.grade is not None:
                        graded += 1
                        avg_grade += sub.grade
                        grade_count += 1

            ctx["homework_stats"] = {
                "total": total_hw,
                "submitted": submitted,
                "graded": graded,
                "pending": total_hw - submitted,
                "avg_grade": round(avg_grade / grade_count, 1) if grade_count > 0 else None,
            }

        return ctx

    # 每种智能体类型的优先模型提供商（参考 Open Deep Research 任务专属模型）
    AGENT_PREFERRED_PROVIDER = {
        "teaching_assistant": None,   # 使用默认（需要强推理能力）
        "study_coach": None,          # 使用默认
        "creative_writer": None,      # 使用默认
        "code_coach": None,           # 使用默认
    }

    async def _invoke_agent(self, agent: Agent, message: str,
                            user_context: Dict[str, Any],
                            user=None, class_id: Optional[str] = None) -> Dict[str, Any]:
        """调用智能体（数据库配置 > .env > 规则回退）"""
        from app.agents.llm_factory import (
            get_llm_for_user, is_llm_available_for_user,
            get_llm, is_llm_available,
        )

        # 1. 尝试使用真实 LLM（数据库配置优先）
        llm = None
        if user is not None and is_llm_available_for_user(self.db, user, class_id):
            preferred = self.AGENT_PREFERRED_PROVIDER.get(agent.type)
            llm = get_llm_for_user(self.db, user, class_id, preferred)

        # 兼容旧调用（无 user 时回退到 .env）
        if llm is None and user is None and is_llm_available():
            preferred = self.AGENT_PREFERRED_PROVIDER.get(agent.type)
            llm = get_llm(preferred)

        if llm is not None:
            try:
                system_prompt = agent.system_prompt or self._get_default_prompt(agent.type)
                context_str = self._format_context_for_llm(user_context)

                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "system", "content": context_str},
                    {"role": "user", "content": message},
                ]

                response_text = await llm.chat(messages, temperature=0.7, max_tokens=2000)
                return {"response": response_text, "provider": llm.config.provider}
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"LLM调用失败，回退到规则匹配: {e}")

        # 2. 回退到上下文感知的规则匹配
        return {"response": self._get_context_aware_response(agent, message, user_context)}

    async def stream_chat(self, user, agent: Agent, message: str,
                          conversation_id: Optional[str] = None,
                          class_id: Optional[str] = None,
                          homework_id: Optional[str] = None):
        """流式对话（SSE），逐 token 返回"""
        from app.agents.llm_factory import (
            get_llm_for_user, is_llm_available_for_user,
        )

        if conversation_id:
            conversation = self.db.query(AgentConversation).filter(
                AgentConversation.id == conversation_id,
                AgentConversation.user_id == user.id,
            ).first()
            if not conversation:
                conversation = self._create_conversation(user, agent, class_id)
        else:
            conversation = self._create_conversation(user, agent, class_id)

        self._save_message(conversation.id, "user", message)
        user_context = self._build_user_context(user, class_id, homework_id)

        full_response = ""

        # 1. 尝试 LLM 流式输出（数据库配置优先）
        llm = None
        if is_llm_available_for_user(self.db, user, class_id):
            preferred = self.AGENT_PREFERRED_PROVIDER.get(agent.type)
            llm = get_llm_for_user(self.db, user, class_id, preferred)

        if llm is not None:
            try:
                system_prompt = agent.system_prompt or self._get_default_prompt(agent.type)
                context_str = self._format_context_for_llm(user_context)
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "system", "content": context_str},
                    {"role": "user", "content": message},
                ]

                async for token in llm.stream_chat(messages, temperature=0.7, max_tokens=2000):
                    full_response += token
                    yield {"type": "token", "content": token}

            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"LLM流式调用失败: {e}")
                # 回退到规则匹配
                fallback = self._get_context_aware_response(agent, message, user_context)
                full_response = fallback
                yield {"type": "token", "content": fallback}
        else:
            # 2. 无 LLM，使用规则匹配
            fallback = self._get_context_aware_response(agent, message, user_context)
            full_response = fallback
            yield {"type": "token", "content": fallback}

        # 保存助手回复
        self._save_message(conversation.id, "assistant", full_response)
        conversation.updated_at = datetime.utcnow()
        self.db.commit()

        yield {
            "type": "done",
            "conversationId": conversation.id,
            "agentId": agent.id,
        }

    def _format_context_for_llm(self, ctx: Dict[str, Any]) -> str:
        """将用户上下文格式化为 LLM 可读的系统提示"""
        parts = ["以下是当前用户的信息，请基于此信息回答："]

        role = ctx.get("role", "student")
        name = ctx.get("name", "用户")
        parts.append(f"用户身份：{name}（{'教师' if role == 'teacher' else '学生'}）")
        parts.append(f"等级：Lv.{ctx.get('level', 1)}，星星：{ctx.get('stars', 0)}")

        if ctx.get("class_name"):
            parts.append(f"班级：{ctx['class_name']}")

        hw_ctx = ctx.get("homework")
        if hw_ctx:
            parts.append(f"当前作业：{hw_ctx['title']}（科目：{hw_ctx['subject']}）")
            parts.append(f"作业要求：{hw_ctx.get('description', '无')}")

        sub_ctx = ctx.get("submission")
        if sub_ctx:
            parts.append(f"提交状态：{sub_ctx['status']}")
            if sub_ctx.get("grade") is not None:
                parts.append(f"成绩：{sub_ctx['grade']}分")
            if sub_ctx.get("feedback"):
                parts.append(f"老师反馈：{sub_ctx['feedback']}")

        stats = ctx.get("homework_stats")
        if stats:
            parts.append(f"作业统计：总共{stats.get('total', 0)}个，已提交{stats.get('submitted', 0)}个，待完成{stats.get('pending', 0)}个")
            if stats.get("avg_grade"):
                parts.append(f"平均分：{stats['avg_grade']}分")

        sub_stats = ctx.get("submission_stats")
        if sub_stats:
            parts.append(f"提交统计：总共{sub_stats.get('total', 0)}份，已批改{sub_stats.get('graded', 0)}份，待批改{sub_stats.get('pending', 0)}份")

        if ctx.get("class_students_count"):
            parts.append(f"班级人数：{ctx['class_students_count']}人")

        return "\n".join(parts)

    def _get_default_prompt(self, agent_type: str) -> str:
        prompts = {
            "teaching_assistant": "你是一位专业的智能助教，擅长批改作业、提供学习反馈和解答问题。请始终保持专业、耐心和鼓励的态度。",
            "study_coach": "你是一位学习教练，帮助学生制定学习计划、跟踪学习进度，提供学习方法和时间管理建议。",
            "creative_writer": "你是一位创意写作导师，激发学生的创意思维，辅助写作练习，提供写作技巧和灵感。",
            "code_coach": "你是一位编程教练，解答编程问题，进行代码review，提供编程最佳实践建议。",
        }
        return prompts.get(agent_type, "你是一个智能助手。")

    def _get_context_aware_response(self, agent: Agent, message: str,
                                     user_context: Dict[str, Any]) -> str:
        """基于用户上下文生成智能回复"""
        name = user_context.get("name", "同学")
        role = user_context.get("role", "student")
        msg_lower = message.lower()
        agent_type = agent.type

        # 根据智能体类型和用户角色生成不同回复
        if agent_type == "teaching_assistant" and role == "teacher":
            return self._teacher_assistant_response(name, message, user_context, msg_lower)
        elif agent_type == "study_coach" and role == "student":
            return self._study_coach_response(name, message, user_context, msg_lower)
        elif agent_type == "code_coach":
            return self._code_coach_response(name, message, user_context, msg_lower)
        elif agent_type == "creative_writer":
            return self._creative_writer_response(name, message, user_context, msg_lower)

        # 通用回复
        return self._general_response(name, message, agent, user_context, msg_lower)

    def _teacher_assistant_response(self, name, message, ctx, msg_lower):
        """智能助教 - 教师视角"""
        stats = ctx.get("submission_stats", {})

        if any(w in msg_lower for w in ["批改", "grade", "评分", "分析"]):
            hw_list = ctx.get("teacher_homeworks", [])
            hw_info = "\n".join([f"  - {h['title']} ({h['subject']})" for h in hw_list[:5]])
            return (
                f"{name}老师，以下是您的作业批改概览：\n\n"
                f"📊 提交统计：\n"
                f"  - 总提交数：{stats.get('total', 0)}\n"
                f"  - 已批改：{stats.get('graded', 0)}\n"
                f"  - 待批改：{stats.get('pending', 0)}\n\n"
                f"📝 您的作业列表：\n{hw_info}\n\n"
                f"💡 建议：\n"
                f"  - 在「作业批改」页面点击「AI批改」按钮可快速生成评分建议\n"
                f"  - 对编程类作业，可使用代码辅导智能体分析代码质量\n"
                f"  - 对写作类作业，可使用创意写作智能体评估文采\n"
            )

        if any(w in msg_lower for w in ["学生", "student", "表现", "成绩"]):
            student_count = ctx.get("class_students_count", 0)
            return (
                f"{name}老师，班级学生情况：\n\n"
                f"👥 班级人数：{student_count}人\n"
                f"📋 作业提交率：{stats.get('total', 0)}份提交，待批改{stats.get('pending', 0)}份\n\n"
                f"💡 您可以在「学生管理」页面查看每位学生的能力六芒星图，\n"
                f"了解他们在作业完成度、正确率、参与度等维度的表现。\n"
            )

        if any(w in msg_lower for w in ["你好", "hello", "hi"]):
            return (
                f"{name}老师您好！我是智能助教，可以帮您：\n\n"
                f"  1. 📊 分析作业提交情况和班级表现\n"
                f"  2. 📝 辅助批改作业（在批改页面点击AI批改）\n"
                f"  3. 🎯 生成学生学习建议\n"
                f"  4. 📋 分析常见错误类型\n\n"
                f"请问有什么可以帮您的？"
            )

        return (
            f"{name}老师，我了解到的班级情况：\n"
            f"  - 班级人数：{ctx.get('class_students_count', '未知')}人\n"
            f"  - 待批改提交：{stats.get('pending', 0)}份\n\n"
            f"您可以问我关于作业批改、学生表现分析等问题。"
        )

    def _study_coach_response(self, name, message, ctx, msg_lower):
        """学习辅导 - 学生视角"""
        stats = ctx.get("homework_stats", {})
        hw_ctx = ctx.get("homework")
        sub_ctx = ctx.get("submission")

        if hw_ctx:
            # 有作业上下文
            hw_title = hw_ctx["title"]
            hw_subject = hw_ctx["subject"]
            hw_desc = hw_ctx.get("description", "")

            if sub_ctx and sub_ctx.get("grade") is not None:
                return (
                    f"{name}，关于作业「{hw_title}」：\n\n"
                    f"📋 你的提交状态：{sub_ctx['status']}\n"
                    f"✅ 得分：{sub_ctx['grade']}分\n"
                    f"💬 老师反馈：{sub_ctx.get('feedback', '暂无')}\n\n"
                    f"💡 学习建议：\n"
                    f"  1. 仔细阅读老师反馈，理解失分原因\n"
                    f"  2. 针对薄弱知识点进行专项练习\n"
                    f"  3. 有不懂的地方可以继续问我\n"
                )
            elif sub_ctx:
                return (
                    f"{name}，关于作业「{hw_title}」：\n\n"
                    f"📋 你已提交，等待老师批改中。\n"
                    f"📝 作业要求：{hw_desc[:200]}\n\n"
                    f"💡 在等待批改期间，你可以：\n"
                    f"  1. 复习相关知识点\n"
                    f"  2. 检查提交内容是否完整\n"
                    f"  3. 准备下一个作业\n"
                )
            else:
                return (
                    f"{name}，关于作业「{hw_title}」：\n\n"
                    f"📝 作业要求：{hw_desc[:200]}\n"
                    f"📚 科目：{hw_subject}\n"
                    f"⏰ 截止时间：{hw_ctx.get('due_date', '未知')}\n\n"
                    f"💡 完成建议：\n"
                    f"  1. 先理解题目要求\n"
                    f"  2. 列出解题思路\n"
                    f"  3. 如果是编程题，可以用代码辅导智能体\n"
                    f"  4. 如果是写作题，可以用创意写作智能体\n"
                )

        if any(w in msg_lower for w in ["学习计划", "plan", "建议", "怎么学"]):
            avg = stats.get("avg_grade")
            avg_str = f"平均分{avg}分" if avg else "暂无成绩数据"
            pending = stats.get('pending', 0)
            tip1 = "继续保持良好的提交习惯！" if pending == 0 else f"你还有{pending}个作业未提交，请优先完成。"
            tip2 = "成绩不错，可以挑战更高难度的题目。" if avg and avg >= 80 else "建议多做基础练习，巩固知识点。"
            return (
                f"{name}，根据你的学习数据：\n\n"
                f"📊 作业完成情况：\n"
                f"  - 总作业数：{stats.get('total', 0)}\n"
                f"  - 已提交：{stats.get('submitted', 0)}\n"
                f"  - 已批改：{stats.get('graded', 0)}\n"
                f"  - {avg_str}\n\n"
                f"🎯 个性化学习建议：\n"
                f"  1. {tip1}\n"
                f"  2. {tip2}\n"
                f"  3. 遇到难题不要害怕，随时问我或老师\n"
            )

        if any(w in msg_lower for w in ["你好", "hello", "hi"]):
            pending = stats.get("pending", 0)
            return (
                f"你好 {name}！我是你的学习教练 🎓\n\n"
                f"📊 你的学习概况：\n"
                f"  - 等级：Lv.{ctx.get('level', 1)}\n"
                f"  - 星星：⭐ {ctx.get('stars', 0)}\n"
                f"  - 待完成作业：{pending}个\n\n"
                f"我可以帮你：\n"
                f"  1. 📚 讲解知识点\n"
                f"  2. 📋 制定学习计划\n"
                f"  3. 🎯 分析学习薄弱点\n"
                f"  4. 💡 推荐学习方法\n"
            )

        return self._general_response(name, message, None, ctx, msg_lower)

    def _code_coach_response(self, name, message, ctx, msg_lower):
        """代码辅导"""
        if any(w in msg_lower for w in ["python", "print", "def ", "import"]):
            return (
                f"{name}，Python编程要点：\n\n"
                f"🔧 常见问题排查：\n"
                f"  1. 缩进错误 → 统一使用4个空格\n"
                f"  2. 变量未定义 → 检查变量名拼写\n"
                f"  3. 类型错误 → 用 type() 检查变量类型\n\n"
                f"💡 调试技巧：\n"
                f"  - 使用 print() 打印中间结果\n"
                f"  - 逐步注释代码定位问题\n"
                f"  - 善用 try-except 捕获异常\n\n"
                f"把你的代码贴过来，我可以帮你分析具体问题！"
            )

        if any(w in msg_lower for w in ["java", "class ", "public", "system"]):
            return (
                f"{name}，Java编程要点：\n\n"
                f"🔧 常见问题：\n"
                f"  1. NullPointerException → 使用前检查对象是否为null\n"
                f"  2. 数组越界 → 检查索引范围\n"
                f"  3. 类型不匹配 → 注意自动类型转换规则\n\n"
                f"💡 建议：\n"
                f"  - 熟悉面向对象三大特性：封装、继承、多态\n"
                f"  - 多写注释，理清逻辑\n"
            )

        if any(w in msg_lower for w in ["bug", "错误", "error", "报错"]):
            return (
                f"{name}，代码调试指南：\n\n"
                f"📋 排查步骤：\n"
                f"  1. 仔细阅读错误信息，定位行号\n"
                f"  2. 检查该行代码的语法和逻辑\n"
                f"  3. 打印相关变量值\n"
                f"  4. 搜索错误信息寻找解决方案\n\n"
                f"请把错误信息和相关代码贴过来，我帮你分析！"
            )

        return (
            f"{name}，我是代码辅导教练 💻\n\n"
            f"我可以帮你：\n"
            f"  1. 🔍 分析代码逻辑\n"
            f"  2. 🐛 诊断代码错误\n"
            f"  3. ⚡ 提供优化建议\n"
            f"  4. 📖 讲解编程概念\n\n"
            f"请把你的代码或问题贴过来吧！"
        )

    def _creative_writer_response(self, name, message, ctx, msg_lower):
        """创意写作"""
        if any(w in msg_lower for w in ["作文", "写作", "write", "文章"]):
            return (
                f"{name}，写作指导：\n\n"
                f"📝 写作步骤：\n"
                f"  1. 审题 → 明确主题和要求\n"
                f"  2. 构思 → 列提纲，确定结构\n"
                f"  3. 起草 → 按提纲展开内容\n"
                f"  4. 修改 → 润色语言，检查逻辑\n"
                f"  5. 定稿 → 检查错别字和标点\n\n"
                f"💡 提升技巧：\n"
                f"  - 多用比喻、拟人等修辞手法\n"
                f"  - 注意段落之间的过渡\n"
                f"  - 开头要吸引人，结尾要点题\n\n"
                f"告诉我你要写什么主题的作文？"
            )

        if any(w in msg_lower for w in ["故事", "story", "创作"]):
            return (
                f"{name}，故事创作指南：\n\n"
                f"📖 故事三要素：\n"
                f"  1. 人物 → 有鲜明性格特点\n"
                f"  2. 情节 → 有起承转合\n"
                f"  3. 环境 → 营造氛围感\n\n"
                f"🎭 创作技巧：\n"
                f"  - 设置悬念吸引读者\n"
                f"  - 通过对话展现人物性格\n"
                f"  - 细节描写增强画面感\n\n"
                f"你想要创作什么类型的故事？"
            )

        return (
            f"{name}，我是创意写作导师 ✍️\n\n"
            f"我可以帮你：\n"
            f"  1. 📝 构思作文框架\n"
            f"  2. ✨ 激发创作灵感\n"
            f"  3. 🎨 润色文章语言\n"
            f"  4. 📖 讲解写作技巧\n\n"
            f"告诉我你想写什么？"
        )

    def _general_response(self, name, message, agent, ctx, msg_lower):
        """通用回复"""
        agent_name = agent.name if agent else "智能助手"

        if any(w in msg_lower for w in ["你好", "hello", "hi", "嗨"]):
            return f"你好 {name}！我是{agent_name}。请问有什么可以帮你的吗？"

        if any(w in msg_lower for w in ["作业", "homework"]):
            stats = ctx.get("homework_stats", {})
            if stats:
                return (
                    f"{name}，你的作业情况：\n"
                    f"  - 总作业数：{stats.get('total', 0)}\n"
                    f"  - 已提交：{stats.get('submitted', 0)}\n"
                    f"  - 待完成：{stats.get('pending', 0)}\n"
                    f"  - 平均分：{stats.get('avg_grade', '暂无')}\n\n"
                    f"请告诉我具体是哪个作业的问题。"
                )
            return f"{name}，关于作业的问题，请告诉我具体内容。"

        if any(w in msg_lower for w in ["学习计划", "plan"]):
            return (
                f"{name}，学习建议：\n"
                f"  1. 每天固定时间学习\n"
                f"  2. 先完成重要紧急的作业\n"
                f"  3. 适当休息保持效率\n"
            )

        if "?" in message or "？" in message:
            return (
                f"{name}，这是个很好的问题！\n"
                f"让我根据你的情况来回答...\n\n"
                f"建议你：\n"
                f"  1. 查看相关作业内容\n"
                f"  2. 和同学讨论\n"
                f"  3. 继续向我提问\n"
            )

        return f"{name}，我收到了你的消息。你可以问我关于作业、学习计划、编程或写作的问题！"

    async def grade_submission_with_ai(self, submission: Submission, homework: Homework) -> Dict[str, Any]:
        """AI批改作业 - 基于作业内容生成评分和反馈"""
        content = submission.content or ""
        hw_title = homework.title
        hw_desc = homework.description or ""
        hw_subject = homework.subject or ""

        # 基于内容长度和关键词生成评分
        content_len = len(content.strip())
        has_content = content_len > 0

        if not has_content:
            return {
                "grade": 0,
                "feedback": "未提交任何内容，请补充作业内容后重新提交。",
            }

        # 基础评分逻辑
        base_grade = 60

        # 内容长度加分
        if content_len > 500:
            base_grade += 15
        elif content_len > 200:
            base_grade += 10
        elif content_len > 50:
            base_grade += 5

        # 关键词匹配加分（根据科目）
        subject_lower = hw_subject.lower()
        if any(w in subject_lower for w in ["编程", "代码", "code", "编程"]):
            code_keywords = ["def", "function", "class", "import", "print", "return", "if", "for", "while", "var", "let", "const"]
            keyword_count = sum(1 for kw in code_keywords if kw in content.lower())
            base_grade += min(keyword_count * 3, 15)
        elif any(w in subject_lower for w in ["语文", "写作", "作文", "chinese"]):
            # 写作类：检查修辞手法
            rhetoric = ["比喻", "拟人", "排比", "设问", "反问", "像", "仿佛", "犹如"]
            rhetoric_count = sum(1 for r in rhetoric if r in content)
            base_grade += min(rhetoric_count * 3, 15)
        else:
            # 一般科目：检查关键词
            if hw_desc:
                keywords = [w for w in hw_desc.split() if len(w) > 2]
                keyword_count = sum(1 for kw in keywords if kw in content)
                base_grade += min(keyword_count * 2, 15)

        # 限制在0-100
        grade = min(base_grade, 95)

        # 生成反馈
        feedback_parts = []
        feedback_parts.append(f"📊 AI评分：{grade}分\n")

        if grade >= 85:
            feedback_parts.append("✅ 表现优秀！内容充实，要点清晰。")
        elif grade >= 70:
            feedback_parts.append("👍 表现良好，基本完成了作业要求，但还有提升空间。")
        elif grade >= 60:
            feedback_parts.append("📝 基本合格，建议补充更多细节和内容。")
        else:
            feedback_parts.append("⚠️ 需要改进，请仔细阅读作业要求并补充内容。")

        if content_len < 100:
            feedback_parts.append("💡 建议：作业内容较短，建议展开论述，增加细节。")

        feedback_parts.append(f"\n📋 作业「{hw_title}」要求：{hw_desc[:150]}")
        feedback_parts.append("\n💬 老师可在此基础上调整分数和评语。")

        return {
            "grade": grade,
            "feedback": "\n".join(feedback_parts),
        }

    async def analyze_class_performance(self, teacher: User, class_id: str) -> Dict[str, Any]:
        """AI分析班级表现"""
        cls = self.db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            return {"error": "班级不存在"}

        students = self.db.query(User).filter(
            User.class_id == class_id,
            User.role == "student",
        ).all()

        homeworks = self.db.query(Homework).filter(
            Homework.teacher_id == teacher.id
        ).all()

        # 统计数据
        total_students = len(students)
        total_homeworks = len(homeworks)

        all_submissions = []
        for hw in homeworks:
            subs = self.db.query(Submission).filter(
                Submission.homework_id == hw.id
            ).all()
            all_submissions.extend(subs)

        total_submissions = len(all_submissions)
        graded = sum(1 for s in all_submissions if s.status == "graded")
        grades = [s.grade for s in all_submissions if s.grade is not None]
        avg_grade = round(sum(grades) / len(grades), 1) if grades else 0

        # 按作业统计提交率
        hw_stats = []
        for hw in homeworks:
            subs = [s for s in all_submissions if s.homework_id == hw.id]
            hw_grades = [s.grade for s in subs if s.grade is not None]
            hw_avg = round(sum(hw_grades) / len(hw_grades), 1) if hw_grades else 0
            hw_stats.append({
                "title": hw.title,
                "subject": hw.subject,
                "submissions": len(subs),
                "avg_grade": hw_avg,
            })

        # 生成分析报告
        report_parts = [
            f"📊 班级「{cls.name}」AI分析报告\n",
            f"👥 班级人数：{total_students}人",
            f"📝 已发布作业：{total_homeworks}个",
            f"📋 总提交数：{total_submissions}份",
            f"✅ 已批改：{graded}份",
            f"⏳ 待批改：{total_submissions - graded}份",
            f"📈 班级平均分：{avg_grade}分\n",
        ]

        if hw_stats:
            report_parts.append("📚 各作业情况：")
            for hs in hw_stats[:5]:
                report_parts.append(f"  - {hs['title']}：{hs['submissions']}人提交，平均{hs['avg_grade']}分")

        # AI建议
        report_parts.append("\n💡 AI教学建议：")
        if avg_grade >= 85:
            report_parts.append("  - 班级整体表现优秀，可适当增加挑战性作业")
        elif avg_grade >= 70:
            report_parts.append("  - 班级表现良好，建议关注低分学生，提供额外辅导")
        else:
            report_parts.append("  - 班级平均分偏低，建议复习基础知识，降低作业难度")

        if total_submissions - graded > 0:
            report_parts.append(f"  - 有{total_submissions - graded}份作业待批改，建议及时批改")

        submission_rate = round(total_submissions / (total_students * total_homeworks) * 100, 1) if total_students * total_homeworks > 0 else 0
        if submission_rate < 80:
            report_parts.append(f"  - 作业提交率{submission_rate}%，建议督促学生按时提交")
        else:
            report_parts.append(f"  - 作业提交率{submission_rate}%，提交情况良好")

        return {
            "report": "\n".join(report_parts),
            "stats": {
                "totalStudents": total_students,
                "totalHomeworks": total_homeworks,
                "totalSubmissions": total_submissions,
                "graded": graded,
                "pending": total_submissions - graded,
                "avgGrade": avg_grade,
                "submissionRate": submission_rate,
            },
            "homeworkStats": hw_stats,
        }
