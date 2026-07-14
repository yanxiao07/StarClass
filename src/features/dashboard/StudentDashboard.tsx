import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { classApi } from '../../services/class';
import { homeworkApi } from '../../services/homework';
import { submissionApi } from '../../services/submission';
import { userApi, StudentStats } from '../../services/user';
import { apiClient } from '../../services/client';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const loadStats = async () => {
    try {
      if (user?.role === 'student') {
        const [homeworks, submissions, statsData] = await Promise.all([
          homeworkApi.getHomeworks(),
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

  const handleGetAISuggestion = async () => {
    if (!user) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const agents = await apiClient.get<any[]>('/api/agents');
      const studyCoach = agents.find(a => a.type === 'study_coach') || agents[0];
      if (!studyCoach) {
        setAiSuggestion('暂无可用的AI智能体，请稍后再试。');
        return;
      }
      const result = await apiClient.post<{ response?: string }>(`/api/agents/${studyCoach.id}/chat`, {
        message: '请根据我的学习情况给出建议',
        class_id: user.classId,
      });
      setAiSuggestion(result.response || '暂无建议内容。');
    } catch (err: any) {
      setAiSuggestion(err.message || '获取AI学习建议失败，请稍后重试。');
    } finally {
      setAiLoading(false);
    }
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
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', background: '#ffffff', border: '1px solid #e2e8f0', backdropFilter: 'blur(16px) saturate(150%)' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <Icon name="rocket" size={64} color="#2563eb" />
          </div>
          <h2 style={{ marginBottom: '1rem', color: '#0f172a' }}>欢迎来到作业管理系统！</h2>
          <p style={{ marginBottom: '2rem', color: '#64748b', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            请加入班级开始使用。向你的老师询问班级号！
          </p>
          <button className="btn btn-primary" onClick={() => setShowJoinClass(true)} style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="login" size={18} color="#fff" />
            加入班级
          </button>
        </div>

        {showJoinClass && (
          <div className="modal-overlay" onClick={() => setShowJoinClass(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="class" size={20} color="#2563eb" />
                  加入班级
                </h3>
                <button className="btn" onClick={() => setShowJoinClass(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Icon name="close" size={16} color="#334155" />
                  关闭
                </button>
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
                <button className="btn" onClick={() => setShowJoinClass(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Icon name="close" size={16} color="#334155" />
                  取消
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleJoinClass}
                  disabled={loading || classCode.trim().length < 4}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Icon name="check" size={16} color="#fff" />
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
      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', backdropFilter: 'blur(16px) saturate(150%)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="student" size={24} color="#2563eb" />
            欢迎回来，{user.nickname || user.name}同学！
          </h2>
          <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Icon name="class" size={14} color="#f59e0b" />
            {user.className}
          </span>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="homework" size={24} color="#60a5fa" />
          </div>
          <div className="stat-value">{stats.pendingHomeworks}</div>
          <div className="stat-label">待完成作业</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="check" size={24} color="#10b981" />
          </div>
          <div className="stat-value">{stats.completedHomeworks}</div>
          <div className="stat-label">已完成作业</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="star" size={24} color="#f59e0b" />
          </div>
          <div className="stat-value">{stats.totalStars}</div>
          <div className="stat-label">获得星星</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={handleLevelClick}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="trophy" size={24} color="#f59e0b" />
          </div>
          <div className="stat-value">Lv.{stats.level}</div>
          <div className="stat-label">当前等级</div>
        </div>
      </div>

      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', backdropFilter: 'blur(16px) saturate(150%)' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="chart" size={20} color="#2563eb" />
            能力维度
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          {abilityStats.map((stat) => (
            <div key={stat.name} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#0f172a', fontSize: '0.875rem' }}>{stat.name}</span>
                <span style={{ color: '#334155', fontSize: '0.875rem', fontWeight: 600 }}>{stat.value}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${stat.value}%`,
                    background: '#2563eb',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                    boxShadow: 'none',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', backdropFilter: 'blur(16px) saturate(150%)' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="bulb" size={20} color="#f59e0b" />
            AI学习建议
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          {!aiSuggestion && !aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', marginBottom: '1rem' }}>
              <Icon name="spark" size={22} color="#2563eb" />
              <p style={{ color: '#334155', fontSize: '0.875rem', margin: 0 }}>
                点击下方按钮，AI将根据你的学习情况给出个性化建议。
              </p>
            </div>
          )}
          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', marginBottom: '1rem', fontSize: '0.875rem', padding: '1rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              <Icon name="loading" size={18} color="#2563eb" spin />
              AI正在分析你的学习情况...
            </div>
          )}
          {aiSuggestion && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: '#eff6ff',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                color: '#0f172a',
                fontSize: '0.875rem',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                marginBottom: '1rem',
                boxShadow: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(37, 99, 235, 0.2)' }}>
                <Icon name="robot" size={18} color="#2563eb" />
                <span style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' }}>AI 智能分析</span>
              </div>
              {aiSuggestion}
            </div>
          )}
          <button
            onClick={handleGetAISuggestion}
            disabled={aiLoading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              background: aiLoading ? 'rgba(37, 99, 235, 0.5)' : '#2563eb',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon name={aiLoading ? 'loading' : 'spark'} size={16} color="#fff" spin={aiLoading} />
            {aiLoading ? '获取中...' : '获取AI学习建议'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
