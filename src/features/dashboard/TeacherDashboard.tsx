import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { classApi } from '../../services/class';
import { homeworkApi } from '../../services/homework';
import { submissionApi } from '../../services/submission';
import { apiClient } from '../../services/client';
import Icon from '../../components/Icon';

interface ClassData {
  id: string;
  name: string;
  classCode: string;
  _count?: {
    students: number;
  };
}

interface Stats {
  totalHomeworks: number;
  pendingSubmissions: number;
  totalStudents: number;
  avgGrade: number;
}

interface AIAnalysisStats {
  studentCount?: number;
  totalHomeworks?: number;
  totalSubmissions?: number;
  averageScore?: number;
  submissionRate?: number | string;
}

interface AIAnalysisResponse {
  report?: string;
  stats?: AIAnalysisStats;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalHomeworks: 0,
    pendingSubmissions: 0,
    totalStudents: 0,
    avgGrade: 0
  });
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [aiStats, setAiStats] = useState<AIAnalysisStats | null>(null);
  const [aiError, setAiError] = useState('');

  const loadData = async () => {
    try {
      const classData = await classApi.getTeacherClasses();
      setClasses(classData);

      let totalStudents = 0;
      classData.forEach((cls: any) => {
        totalStudents += cls._count?.students || 0;
      });

      const homeworks = await homeworkApi.getHomeworks();
      const submissions = await submissionApi.getSubmissions();

      const pendingCount = submissions.filter((s: any) => s.status === 'submitted' || s.status === 'pending').length;

      const gradedSubmissions = submissions.filter((s: any) => s.status === 'graded' && s.grade != null);
      let avgGrade = 0;
      if (gradedSubmissions.length > 0) {
        const totalGrade = gradedSubmissions.reduce((sum: number, s: any) => sum + s.grade, 0);
        avgGrade = Math.round(totalGrade / gradedSubmissions.length);
      }

      setStats({
        totalHomeworks: homeworks.length,
        pendingSubmissions: pendingCount,
        totalStudents,
        avgGrade
      });
    } catch (err: any) {
      console.error('加载数据失败:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateClass = async () => {
    if (!className.trim()) return;

    setLoading(true);
    setError('');

    try {
      await classApi.createClass(className);
      setClassName('');
      setShowCreateClass(false);
      loadData();
    } catch (err: any) {
      setError(err.message || '创建班级失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIAnalysis = async () => {
    setAiAnalyzing(true);
    setAiError('');
    setAiReport('');
    setAiStats(null);

    try {
      let classId = user?.classId;

      if (!classId) {
        const teacherClasses = await apiClient.get<any[]>('/api/classes/teacher');
        if (teacherClasses && teacherClasses.length > 0) {
          classId = teacherClasses[0].id;
        }
      }

      if (!classId) {
        setAiError('未找到班级信息，请先创建班级');
        return;
      }

      const response = await apiClient.post<AIAnalysisResponse>(
        '/api/agents/analyze-class',
        { class_id: classId }
      );

      if (response.report) {
        setAiReport(response.report);
      }
      if (response.stats) {
        setAiStats(response.stats);
      }
    } catch (err: any) {
      console.error('AI班级分析失败:', err);
      setAiError(err.message || 'AI分析服务暂时不可用，请稍后重试');
    } finally {
      setAiAnalyzing(false);
    }
  };

  if (!user) return null;

  const aiStatCards = aiStats
    ? [
      { label: '班级人数', value: aiStats.studentCount ?? '-', icon: 'users', color: '#2563eb' },
      { label: '总作业数', value: aiStats.totalHomeworks ?? '-', icon: 'homework', color: '#2563eb' },
      { label: '提交数', value: aiStats.totalSubmissions ?? '-', icon: 'check', color: '#10b981' },
      { label: '平均分', value: aiStats.averageScore != null ? aiStats.averageScore : '-', icon: 'medal', color: '#f59e0b' },
      { label: '提交率', value: aiStats.submissionRate != null ? aiStats.submissionRate : '-', icon: 'chart', color: '#ec4899' },
    ]
    : [];

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="user" size={22} color="#2563eb" />
            欢迎回来，{user.name}老师！
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateClass(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Icon name="add" size={16} color="#ffffff" />
            创建班级
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="homework" size={22} color="#2563eb" />
          </div>
          <div className="stat-value">{stats.totalHomeworks}</div>
          <div className="stat-label">已布置作业</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="pen" size={22} color="#ec4899" />
          </div>
          <div className="stat-value">{stats.pendingSubmissions}</div>
          <div className="stat-label">待批改作业</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="users" size={22} color="#10b981" />
          </div>
          <div className="stat-value">{stats.totalStudents}</div>
          <div className="stat-label">学生人数</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Icon name="chart" size={22} color="#f59e0b" />
          </div>
          <div className="stat-value">{stats.avgGrade > 0 ? stats.avgGrade : '-'}</div>
          <div className="stat-label">平均成绩</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="robot" size={22} color="#2563eb" />
            AI 班级分析
          </h3>
          <button
            onClick={handleGenerateAIAnalysis}
            disabled={aiAnalyzing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.625rem 1.5rem',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: aiAnalyzing ? 'not-allowed' : 'pointer',
              color: '#ffffff',
              background: '#2563eb',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
              opacity: aiAnalyzing ? 0.6 : 1,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Icon name="spark" size={16} color="#ffffff" spin={aiAnalyzing} />
            {aiAnalyzing ? 'AI 分析中...' : '生成AI分析报告'}
          </button>
        </div>

        {aiError && (
          <div
            className="error-message"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          >
            <Icon name="warning" size={16} color="#ef4444" />
            {aiError}
          </div>
        )}

        {aiAnalyzing && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2.5rem 1rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              color: '#2563eb',
            }}
          >
            <Icon name="loading" size={36} color="#2563eb" spin style={{ marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>AI 正在分析班级数据，请稍候...</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              正在汇总作业、提交与成绩数据
            </p>
          </div>
        )}

        {!aiAnalyzing && aiStats && (
          <div className="grid grid-4" style={{ marginBottom: '1.25rem' }}>
            {aiStatCards.map((card) => (
              <div key={card.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Icon name={card.icon} size={22} color={card.color} />
                </div>
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {!aiAnalyzing && aiReport && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#0f172a',
              fontSize: '0.9375rem',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                marginBottom: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#2563eb',
                letterSpacing: '0.3px',
              }}
            >
              <Icon name="bulb" size={12} color="#2563eb" />
              AI 分析报告
            </div>
            {aiReport}
          </div>
        )}

        {!aiAnalyzing && !aiReport && !aiError && !aiStats && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.25rem 1.5rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px dashed rgba(37, 99, 235, 0.3)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <Icon name="bulb" size={28} color="#2563eb" />
            </div>
            <p style={{ color: '#0f172a', fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>
              AI 班级分析助手
            </p>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.375rem 0 0' }}>
              点击上方按钮，AI 将根据班级作业与提交数据生成分析报告。
            </p>
          </div>
        )}
      </div>

      {classes.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="class" size={22} color="#2563eb" />
              我的班级
            </h3>
          </div>
          <div className="class-list">
            {classes.map((cls) => (
              <div key={cls.id} className="class-item card">
                <div className="class-info">
                  <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Icon name="class" size={16} color="#2563eb" />
                    {cls.name}
                  </h4>
                  <p>班级号: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cls.classCode}</span></p>
                </div>
                <div className="class-stats">
                  <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Icon name="users" size={12} color="#2563eb" />
                    {cls._count?.students || 0} 名学生
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateClass && (
        <div className="modal-overlay" onClick={() => setShowCreateClass(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="add" size={18} color="#2563eb" />
                创建新班级
              </h3>
              <button
                className="btn"
                onClick={() => setShowCreateClass(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Icon name="close" size={14} color="#334155" />
                关闭
              </button>
            </div>
            <div className="modal-content">
              {error && (
                <div
                  className="error-message"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Icon name="warning" size={16} color="#ef4444" />
                  {error}
                </div>
              )}
              <div className="form-group">
                <label>班级名称</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="请输入班级名称"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => setShowCreateClass(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Icon name="close" size={14} color="#334155" />
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateClass}
                disabled={loading || !className.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Icon name="check" size={14} color="#ffffff" />
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
