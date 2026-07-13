import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { classApi } from '../../services/class';
import { chatApi } from '../../services/chat';
import { useNavigate } from 'react-router-dom';

interface ClassData {
  id: string;
  name: string;
  classCode: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
  };
}

const MyClasses: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [classesWithNewMessages, setClassesWithNewMessages] = useState<Set<string>>(new Set());

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (user?.role === 'teacher') {
        const data = await classApi.getTeacherClasses();
        setClasses(data);
        
        const newMessagesSet = new Set<string>();
        for (const cls of data) {
          try {
            const isMuted = localStorage.getItem(`muted_${user.id}_${cls.id}`) === 'true';
            if (isMuted) continue;
            
            const messages = await chatApi.getClassMessages(cls.id);
            const otherMessages = messages.filter((msg: any) => msg.sender.id !== user.id);
            if (otherMessages.length > 0) {
              const lastMessage = otherMessages[otherMessages.length - 1];
              const lastViewed = localStorage.getItem(`lastViewed_${user.id}_${cls.id}`);
              if (!lastViewed || new Date(lastMessage.createdAt) > new Date(lastViewed)) {
                newMessagesSet.add(cls.id);
              }
            }
          } catch (err) {
            console.log(`Failed to load messages for class ${cls.id}`);
          }
        }
        setClassesWithNewMessages(newMessagesSet);
      } else if (user?.classId) {
        const data = await classApi.getClassById(user.classId);
        setClasses([data]);
        
        const newMessagesSet = new Set<string>();
        try {
          const isMuted = localStorage.getItem(`muted_${user.id}_${user.classId}`) === 'true';
          if (!isMuted) {
            const messages = await chatApi.getClassMessages(user.classId);
            const otherMessages = messages.filter((msg: any) => msg.sender.id !== user.id);
            if (otherMessages.length > 0) {
              const lastMessage = otherMessages[otherMessages.length - 1];
              const lastViewed = localStorage.getItem(`lastViewed_${user.id}_${user.classId}`);
              if (!lastViewed || new Date(lastMessage.createdAt) > new Date(lastViewed)) {
                newMessagesSet.add(user.classId);
              }
            }
          }
        } catch (err) {
          console.log(`Failed to load messages for class ${user.classId}`);
        }
        setClassesWithNewMessages(newMessagesSet);
      }
    } catch (err: any) {
      setError(err.message || '加载班级失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      alert('请输入班级号');
      return;
    }

    setJoining(true);
    setError('');
    try {
      await classApi.joinClass(classCode.trim());
      alert('加入班级成功！');
      setShowJoinClass(false);
      setClassCode('');
      await refreshUser();
      loadClasses();
    } catch (err: any) {
      setError(err.response?.data?.error || '加入班级失败');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    loadClasses();
    
    const interval = setInterval(() => {
      loadClasses();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const handleClassClick = (classId: string) => {
    navigate(`/class/${classId}/chat`);
  };

  return (
    <div className="my-classes-page">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">我的班级</h2>
          {user.role === 'student' && !user.classId && (
            <button className="btn btn-primary" onClick={() => setShowJoinClass(true)}>
              加入班级
            </button>
          )}
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
            {user.role === 'teacher' ? '还没有创建班级' : '还没有加入班级'}
          </div>
        ) : (
          <div className="grid grid-2">
            {classes.map((cls) => (
              <div 
                key={cls.id} 
                className="class-card" 
                style={{ 
                  padding: '1.5rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleClassClick(cls.id)}
              >
                {classesWithNewMessages.has(cls.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444'
                  }} />
                )}
                <div className="class-card-header" style={{ marginBottom: '1rem' }}>
                  <h3>{cls.name}</h3>
                  <span className="badge badge-pending">班级号: {cls.classCode}</span>
                </div>
                <p style={{ color: '#718096', margin: '0.5rem 0' }}>
                  创建时间: {cls.createdAt.split('T')[0]}
                </p>
                {user.role === 'teacher' && (
                  <p style={{ color: '#718096', margin: '0.5rem 0' }}>
                    学生人数: {cls._count?.students || 0}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
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
                  className="form-input"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="请输入班级号"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowJoinClass(false)}>取消</button>
              <button 
                className="btn btn-primary" 
                onClick={handleJoinClass}
                disabled={joining}
              >
                {joining ? '加入中...' : '加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClasses;
