import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { classApi } from '../../services/class';
import { apiClient } from '../../services/client';

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

  const loadData = async () => {
    try {
      const classData = await classApi.getTeacherClasses();
      setClasses(classData);
      
      let totalStudents = 0;
      classData.forEach((cls: any) => {
        totalStudents += cls._count?.students || 0;
      });
      
      const homeworks = await apiClient.get<any[]>('/api/homework');
      const submissions = await apiClient.get<any[]>('/api/submissions');
      
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

  if (!user) return null;

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">欢迎回来，{user.name}老师！</h2>
          <button className="btn" onClick={() => setShowCreateClass(true)}>
            创建班级
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.totalHomeworks}</div>
          <div className="stat-label">已布置作业</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingSubmissions}</div>
          <div className="stat-label">待批改作业</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalStudents}</div>
          <div className="stat-label">学生人数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgGrade > 0 ? stats.avgGrade : '-'}</div>
          <div className="stat-label">平均成绩</div>
        </div>
      </div>

      {classes.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">我的班级</h3>
          </div>
          <div className="class-list">
            {classes.map((cls) => (
              <div key={cls.id} className="class-item card">
                <div className="class-info">
                  <h4>{cls.name}</h4>
                  <p>班级号: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cls.classCode}</span></p>
                </div>
                <div className="class-stats">
                  <span className="badge">{cls._count?.students || 0} 名学生</span>
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
              <h3>创建新班级</h3>
              <button className="btn" onClick={() => setShowCreateClass(false)}>关闭</button>
            </div>
            <div className="modal-content">
              {error && <div className="error-message">{error}</div>}
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
              <button className="btn" onClick={() => setShowCreateClass(false)}>取消</button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateClass}
                disabled={loading || !className.trim()}
              >
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
