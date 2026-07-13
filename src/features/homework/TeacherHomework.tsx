import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../services/client';
import { classApi } from '../../services/class';
import { Link } from 'react-router-dom';

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  className: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    submissions: number;
  };
}

const TeacherHomework: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    dueDate: '',
    className: '',
    classId: ''
  });

  const loadHomeworks = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Homework[]>('/api/homework');
      setHomeworks(data);
    } catch (err: any) {
      setError(err.message || '加载作业失败');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await classApi.getTeacherClasses();
      setClasses(data);
    } catch (err: any) {
      console.error('加载班级失败:', err);
    }
  };

  useEffect(() => {
    loadHomeworks();
    loadClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingHomework) {
        await apiClient.put(`/api/homework/${editingHomework.id}`, formData);
      } else {
        await apiClient.post('/api/homework', formData);
      }
      
      setShowForm(false);
      setEditingHomework(null);
      setFormData({ title: '', description: '', subject: '', dueDate: '', className: '', classId: '' });
      loadHomeworks();
    } catch (err: any) {
      setError(err.message || '操作失败');
    }
  };

  const handleEdit = (homework: Homework) => {
    setEditingHomework(homework);
    setFormData({
      title: homework.title,
      description: homework.description,
      subject: homework.subject,
      dueDate: homework.dueDate.split('T')[0],
      className: homework.className,
      classId: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个作业吗？')) {
      return;
    }

    try {
      setError('');
      await apiClient.delete(`/api/homework/${id}`);
      loadHomeworks();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingHomework(null);
    setFormData({ title: '', description: '', subject: '', dueDate: '', className: '', classId: '' });
    setError('');
  };

  if (!user) return null;

  return (
    <div className="homework-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">作业管理</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '取消' : '+ 布置新作业'}
          </button>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem', color: '#dc2626' }}>{error}</div>}

        {showForm && (
          <form onSubmit={handleSubmit} className="homework-form">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">作业标题</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">科目</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入科目名称"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">作业描述</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">截止日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">班级</label>
                <select
                  className="form-select"
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  required
                >
                  <option value="">请选择班级</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                {editingHomework ? '更新作业' : '发布作业'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">作业列表</h3>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div>
        ) : (
          <div className="homework-list">
            {homeworks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                暂无作业
              </div>
            ) : (
              homeworks.map((hw) => (
                <div key={hw.id} className="homework-card">
                  <div className="homework-card-header">
                    <div>
                      <h4>{hw.title}</h4>
                      <span className="badge badge-pending">{hw.subject}</span>
                    </div>
                    <div className="homework-actions">
                      <Link 
                        to={`/submissions?homeworkId=${hw.id}`} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        查看提交
                      </Link>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem' }}
                        onClick={() => handleEdit(hw)}
                      >
                        编辑
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.5rem 1rem' }}
                        onClick={() => handleDelete(hw.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <p style={{ color: '#718096', margin: '1rem 0' }}>{hw.description}</p>
                  <div className="homework-card-footer">
                    <span>📅 截止: {hw.dueDate.split('T')[0]}</span>
                    <span>👥 {hw.className}</span>
                    <span className="badge badge-graded">{hw._count?.submissions || 0} 已提交</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherHomework;
