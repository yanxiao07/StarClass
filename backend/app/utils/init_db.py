from sqlalchemy import create_engine
from app.core.database import Base
from app.core.config import settings
from app.models import user, class_, homework, submission, agent, knowledge, chat

def init_database():
    engine = create_engine(settings.DATABASE_URL)
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    init_database()