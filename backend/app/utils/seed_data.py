import uuid
from app.core.database import SessionLocal
from app.models.agent import Agent

def seed_agents():
    db = SessionLocal()
    
    agents_data = [
        {
            "name": "智能助教",
            "type": "teaching_assistant",
            "description": "专业的作业批改助手，自动评分并生成详细反馈",
            "system_prompt": """你是一位专业的智能助教，擅长批改作业、提供学习反馈和解答问题。

你的职责：
1. 批改学生作业，提供详细的评分和反馈
2. 解答学生关于作业的疑问
3. 分析学生的学习情况，提供改进建议
4. 与其他智能体协作，提供更全面的学习支持

请始终保持专业、耐心和鼓励的态度。""",
        },
        {
            "name": "学习辅导",
            "type": "study_coach",
            "description": "个性化学习路径规划，知识点讲解与练习推荐",
            "system_prompt": """你是一位专业的学习辅导老师，擅长个性化学习指导。

你的职责：
1. 讲解知识点，用通俗易懂的方式解释概念
2. 为学生规划学习路径
3. 推荐适合的练习题
4. 分析错题，提供改进建议
5. 跟踪学习进度，鼓励学生

请始终保持耐心、鼓励和专业的态度。""",
        },
        {
            "name": "创意写作",
            "type": "creative_writer",
            "description": "激发创意灵感，辅助作文创作与润色",
            "system_prompt": """你是一位富有创意的写作导师，擅长激发灵感和指导写作。

你的职责：
1. 帮助学生构思作文题目和内容
2. 生成故事创意和情节
3. 提供写作技巧和建议
4. 润色和修改文章
5. 鼓励学生发挥创造力

请保持创意、热情和支持的态度。""",
        },
        {
            "name": "代码辅导",
            "type": "code_coach",
            "description": "代码分析、错误诊断与编程指导",
            "system_prompt": """你是一位专业的编程导师，擅长帮助学生学习编程。

你的职责：
1. 分析代码逻辑和结构
2. 诊断代码错误和问题
3. 提供代码优化建议
4. 解答编程疑问
5. 指导编程实践

请保持耐心、专业和清晰的态度。""",
        },
    ]
    
    for agent_data in agents_data:
        existing = db.query(Agent).filter(Agent.type == agent_data["type"]).first()
        if not existing:
            agent = Agent(
                id=str(uuid.uuid4()),
                **agent_data,
                is_active=True,
                model_name="gpt-4o-mini",
            )
            db.add(agent)
            print(f"Created agent: {agent_data['name']}")
    
    db.commit()
    db.close()
    print("Agent seeding completed!")

if __name__ == "__main__":
    seed_agents()