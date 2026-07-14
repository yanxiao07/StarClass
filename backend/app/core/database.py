from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL.replace("?charset=utf8", ""),
        echo=True,
        connect_args={
            "check_same_thread": False,
        },
    )
else:
    engine = create_engine(settings.DATABASE_URL, echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_migrations():
    """自动迁移：创建缺失的表 + 添加缺失的列（SQLite ALTER TABLE ADD COLUMN）"""
    from app.models import user, class_, homework, submission, agent, pet  # noqa: F401 确保模型已注册

    # 1. 自动创建所有缺失的表（包括 pets/user_pets/purchases）
    Base.metadata.create_all(bind=engine)

    # 2. users 表列迁移（ALTER TABLE ADD COLUMN）
    inspector = inspect(engine)
    if inspector.has_table("users"):
        existing_columns = {col["name"] for col in inspector.get_columns("users")}
        migrations = [
            ("chat_bubble_style", "VARCHAR(50) DEFAULT 'default'"),
            ("active_avatar", "VARCHAR(100) DEFAULT ''"),
        ]
        with engine.connect() as conn:
            for col_name, col_type in migrations:
                if col_name not in existing_columns:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()