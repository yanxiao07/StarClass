import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { classApi } from '../../services/class';
import { apiClient } from '../../services/client';
import { submissionApi } from '../../services/submission';
import { userApi, StudentStats } from '../../services/user';
import { useNavigate } from 'react-router-dom';

const getLevelFromStars = (stars: number): { level: number; starsNeededForNext: number; currentLevelStars: number; nextLevelStars: number } => {
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

interface Stats {
  pendingHomeworks: number;
  completedHomeworks: number;
  totalStars: number;
  totalMedals: number;
  level: number;
}

const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    pendingHomeworks: 0,
    completedHomeworks: 0,
    totalStars: 0,
    totalMedals: 0,
    level: 0
  });
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      if (user?.role === 'student') {
        const [homeworks, submissions, statsData] = await Promise.all([
          apiClient.get<any[]>('/api/homework'),
          submissionApi.getSubmissions(),
          userApi.getMyStats()
        ]);

        let pending = 0;
        let completed = 0;

        homeworks.forEach((hw) => {
          const hasSubmitted = submissions.some((s) => s.homeworkId === hw.id);
          if (hasSubmitted) {
            completed++;
          } else {
            pending++;
          }
        });

        const levelInfo = getLevelFromStars(user.stars || 0);

        setStats(prev => ({
          ...prev,
          pendingHomeworks: pending,
          completedHomeworks: completed,
          totalStars: user.stars || 0,
          level: levelInfo.level
        }));

        setStudentStats(statsData);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    if (user?.classId) {
      setShowJoinClass(false);
      loadStats();
    }
    if (user) {
      const levelInfo = getLevelFromStars(user.stars || 0);
      setStats(prev => ({
        ...prev,
        totalStars: user.stars || 0,
        level: levelInfo.level
      }));
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshUser();
      if (user?.classId) {
        loadStats();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshUser, user]);

  const handleJoinClass = async () => {
    if (!classCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      await classApi.joinClass(classCode.trim().toUpperCase());
      setClassCode('');
      setShowJoinClass(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || '加入班级失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelClick = () => {
    navigate('/level');
  };

  const abilityStats = [
    { name: '作业完成度', value: studentStats?.homeworkCompletion || 0 },
    { name: '正确率', value: studentStats?.accuracy || 0 },
    { name: '参与度', value: studentStats?.participation || 0 },
    { name: '创新思维', value: studentStats?.creativity || 0 },
    { name: '团队协作', value: studentStats?.teamwork || 0 },
    { name: '进步速度', value: studentStats?.improvement || 0 },
  ];

  if (!user) return null;

  if (!user.classId) {
    return (
      <div className="student-dashboard">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>👋</div>
          <h2 style={{ marginBottom: '1rem', color: '#374151' }}>欢迎来到作业管理系统！</h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            请加入班级开始使用。向你的老师询问班级号！
          </p>
          <button className="btn btn-primary" onClick={() => setShowJoinClass(true)} style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            加入班级
          </button>
        </div>

        {showJoinClass && (
          <div className="modal-overlay" onClick={() => setShowJoinClass(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>加入班级</h3>
                <button className="btn" onClick={() => setShowJoinClass(false)}>关闭</button>
              </div>
              <div className="modal-content">
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                  <label>班级号</label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="请输入6位班级号"
                    maxLength={6}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.5rem' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowJoinClass(false)}>取消</button>
                <button
                  className="btn btn-primary"
                  onClick={handleJoinClass}
                  disabled={loading || classCode.trim().length < 4}
                >
                  {loading ? '加入中...' : '加入'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">欢迎回来，{user.nickname || user.name}同学！</h2>
          <span className="badge">{user.className}</span>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingHomeworks}</div>
          <div className="stat-label">待完成作业</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completedHomeworks}</div>
          <div className="stat-label">已完成作业</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">⭐ {stats.totalStars}</div>
          <div className="stat-label">获得星星</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={handleLevelClick}>
          <div className="stat-value">Lv.{stats.level}</div>
          <div className="stat-label">当前等级</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">能力维度</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          {abilityStats.map((stat) => (
            <div key={stat.name} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#374151' }}>{stat.name}</span>
                <span style={{ color: '#6b7280' }}>{stat.value}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${stat.value}%`,
                    backgroundColor: '#10b981',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
