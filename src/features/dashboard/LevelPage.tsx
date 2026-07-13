import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LevelInfo {
  level: number;
  starsNeededForNext: number;
  currentLevelStars: number;
  nextLevelStars: number;
}

const getLevelFromStars = (stars: number): LevelInfo => {
  const levels = [
    { level: 0, min: 0, max: 0 },
    { level: 1, min: 1, max: 20 },
    { level: 2, min: 21, max: 50 },
    { level: 3, min: 51, max: 100 },
    { level: 4, min: 101, max: 180 },
    { level: 5, min: 181, max: 300 },
    { level: 6, min: 301, max: 500 },
    { level: 7, min: 501, max: 800 },
    { level: 8, min: 801, max: 1200 },
    { level: 9, min: 1201, max: 1800 },
    { level: 10, min: 1801, max: Infinity },
  ];
  
  for (let i = 0; i < levels.length; i++) {
    if (stars >= levels[i].min && stars <= levels[i].max) {
      const nextLevel = levels[i + 1];
      const starsNeededForNext = nextLevel ? nextLevel.min - stars : 0;
      return {
        level: levels[i].level,
        starsNeededForNext,
        currentLevelStars: levels[i].min,
        nextLevelStars: nextLevel ? nextLevel.min : Infinity
      };
    }
  }
  
  return { level: 10, starsNeededForNext: 0, currentLevelStars: 1801, nextLevelStars: Infinity };
};

const LevelPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const stars = user.stars || 0;
  const { level, starsNeededForNext, currentLevelStars, nextLevelStars } = getLevelFromStars(stars);

  const progress = nextLevelStars !== Infinity 
    ? ((stars - currentLevelStars) / (nextLevelStars - currentLevelStars)) * 100 
    : 100;

  const levels = [
    { level: 0, name: '新手入门', color: '#9ca3af', min: 0, max: 0 },
    { level: 1, name: '初级学员', color: '#3b82f6', min: 1, max: 20 },
    { level: 2, name: '进阶学员', color: '#8b5cf6', min: 21, max: 50 },
    { level: 3, name: '中级学员', color: '#10b981', min: 51, max: 100 },
    { level: 4, name: '高级学员', color: '#f59e0b', min: 101, max: 180 },
    { level: 5, name: '精英学员', color: '#ef4444', min: 181, max: 300 },
    { level: 6, name: '大师学员', color: '#8b5cf6', min: 301, max: 500 },
    { level: 7, name: '宗师学员', color: '#ec4899', min: 501, max: 800 },
    { level: 8, name: '传奇学员', color: '#06b6d4', min: 801, max: 1200 },
    { level: 9, name: '神话学员', color: '#eab308', min: 1201, max: 1800 },
    { level: 10, name: '至尊学员', color: '#dc2626', min: 1801, max: Infinity },
  ];

  const currentLevelInfo = levels.find(l => l.level === level);

  return (
    <div className="student-dashboard">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">等级详情</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>返回首页</button>
        </div>

        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '80px', marginBottom: '1rem' }}>
            {level === 10 ? '👑' : level >= 7 ? '🏆' : '⭐'}
          </div>
          <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: currentLevelInfo?.color }}>
            Lv.{level}
          </h1>
          <h2 style={{ color: '#374151', marginBottom: '2rem' }}>
            {currentLevelInfo?.name}
          </h2>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              当前星星: <strong>{stars}</strong>
            </div>
            {level < 10 && (
              <div style={{ color: '#6b7280' }}>
                距离 Lv.{level + 1} 还需要 <strong style={{ color: '#3b82f6' }}>{starsNeededForNext}</strong> 颗星星
              </div>
            )}
            {level === 10 && (
              <div style={{ color: '#dc2626', fontWeight: 'bold' }}>
                恭喜！您已达到最高等级！
              </div>
            )}
          </div>

          {level < 10 && (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ 
                height: '20px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: currentLevelInfo?.color,
                  width: `${progress}%`,
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '0.5rem',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                <span>{currentLevelStars} 颗</span>
                <span>{nextLevelStars} 颗</span>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1rem', color: '#374151' }}>等级说明</h3>
            <div className="grid grid-2">
              {levels.map(l => (
                <div 
                  key={l.level} 
                  style={{ 
                    padding: '1rem', 
                    border: `2px solid ${l.level === level ? l.color : '#e5e7eb'}`,
                    borderRadius: '8px',
                    backgroundColor: l.level === level ? `${l.color}10` : 'white',
                    opacity: l.level > level ? 0.5 : 1
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: l.color, marginBottom: '0.25rem' }}>
                    Lv.{l.level} - {l.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {l.max === Infinity 
                      ? `${l.min}+ 颗星星` 
                      : `${l.min}-${l.max} 颗星星`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelPage;
