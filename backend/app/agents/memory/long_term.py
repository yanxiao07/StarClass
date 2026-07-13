from typing import Dict, Any, Optional
from datetime import datetime

class LongTermMemory:
    def __init__(self):
        self._user_profile: Dict[str, Any] = {}
        self._learning_progress: Dict[str, Any] = {}
        self._preferences: Dict[str, Any] = {}
        self._interactions: Dict[str, Any] = {}
    
    def update_user_profile(self, profile: Dict[str, Any]) -> None:
        self._user_profile.update(profile)
    
    def get_user_profile(self) -> Dict[str, Any]:
        return self._user_profile.copy()
    
    def update_learning_progress(self, subject: str, progress: Dict[str, Any]) -> None:
        if subject not in self._learning_progress:
            self._learning_progress[subject] = {}
        self._learning_progress[subject].update(progress)
    
    def get_learning_progress(self, subject: str = None) -> Dict[str, Any]:
        if subject:
            return self._learning_progress.get(subject, {})
        return self._learning_progress.copy()
    
    def set_preference(self, key: str, value: Any) -> None:
        self._preferences[key] = value
    
    def get_preference(self, key: str, default: Any = None) -> Any:
        return self._preferences.get(key, default)
    
    def record_interaction(self, agent_type: str, action: str, details: Dict[str, Any]) -> None:
        timestamp = datetime.utcnow().isoformat()
        if agent_type not in self._interactions:
            self._interactions[agent_type] = []
        self._interactions[agent_type].append({
            "timestamp": timestamp,
            "action": action,
            "details": details,
        })
    
    def get_interactions(self, agent_type: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        if agent_type:
            return self._interactions.get(agent_type, [])[-limit:]
        return self._interactions.copy()
    
    def get_summary(self) -> Dict[str, Any]:
        return {
            "user_profile": self._user_profile,
            "learning_progress": self._learning_progress,
            "preferences": self._preferences,
            "interaction_count": sum(len(v) for v in self._interactions.values()),
        }