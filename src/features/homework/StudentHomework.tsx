import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../services/client';
import { submissionApi } from '../../services/submission';

const getImageUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `http://localhost:3001${url}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  teacherName: string;
  className: string;
}

const StudentHomework: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [textContent, setTextContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDueSoon = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 1;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [homeworksData, submissionsData] = await Promise.all([
        apiClient.get<Homework[]>('/api/homework'),
        submissionApi.getSubmissions()
      ]);
      
      setHomeworks(homeworksData);
      setSubmissions(submissionsData);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSubmissionForHomework = (homeworkId: string) => {
    return submissions.find((s) => s.homeworkId === homeworkId);
  };

  const handleSubmit = async () => {
    if (!selectedHomework) return;
    if (!textContent.trim() && selectedFiles.length === 0) {
      alert('请填写作业内容或上传文件');
      return;
    }

    setSubmitting(true);
    try {
      await submissionApi.createSubmission({
        homeworkId: selectedHomework.id,
        content: textContent.trim(),
        files: selectedFiles.length > 0 ? selectedFiles : undefined
      });
      alert('作业提交成功！');
      setSelectedHomework(null);
      setTextContent('');
      setSelectedFiles([]);
      loadData();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const urgentHomeworks = homeworks.filter((hw) => {
    const submission = getSubmissionForHomework(hw.id);
    return !submission && isDueSoon(hw.dueDate);
  });

  return (
    <div className="student-homework-page">
      {urgentHomeworks.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div className="card-header" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h3 style={{ margin: 0, color: '#ef4444' }}>紧急提醒！以下作业即将到期</h3>
            </div>
          </div>
          <div style={{ padding: '0 1rem 1rem' }}>
            {urgentHomeworks.map((hw) => (
              <div key={hw.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                <strong>{hw.title}</strong>
                <span style={{ color: '#ef4444', marginLeft: '1rem' }}>
                  截止: {hw.dueDate.split('T')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedHomework ? (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">我的作业</h2>
          </div>

          {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div>
          ) : homeworks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
              暂无作业
            </div>
          ) : (
            <div className="homework-list">
              {homeworks.map((hw) => {
                const submission = getSubmissionForHomework(hw.id);
                const urgent = !submission && isDueSoon(hw.dueDate);
                return (
                  <div
                    key={hw.id}
                    className="homework-card"
                    onClick={() => setSelectedHomework({ ...hw, submission })}
                    style={{ 
                      borderLeft: urgent ? '4px solid #ef4444' : undefined,
                      backgroundColor: urgent ? '#fef2f2' : undefined
                    }}
                  >
                    <div className="homework-card-header">
                      <div>
                        <h4>{hw.title}</h4>
                        <span className="badge badge-pending">{hw.subject}</span>
                        {urgent && (
                          <span className="badge" style={{ backgroundColor: '#ef4444', color: 'white', marginLeft: '0.5rem' }}>
                            即将到期
                          </span>
                        )}
                      </div>
                      <span className={`badge ${submission?.status === 'graded' ? 'badge-graded' : 'badge-pending'}`}>
                        {submission?.status === 'graded' ? '已批改' : submission ? '已提交' : '待提交'}
                      </span>
                    </div>
                    <p style={{ color: '#718096', margin: '1rem 0' }}>{hw.description}</p>
                    <div className="homework-card-footer">
                      <span>👨‍🏫 {hw.teacherName || '老师'}</span>
                      <span>📅 截止: {hw.dueDate.split('T')[0]}</span>
                      {submission?.grade && (
                        <span className="grade-display">{submission.grade}分</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="homework-detail">
          <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedHomework(null);
                setTextContent('');
                setSelectedFiles([]);
              }}
              style={{ marginBottom: '2rem' }}
            >
              ← 返回作业列表
            </button>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">{selectedHomework.title}</h2>
              <span className="badge badge-pending">{selectedHomework.subject}</span>
            </div>
            <div className="homework-info">
              <p><strong>教师：</strong>{selectedHomework.teacherName || '老师'}</p>
              <p><strong>截止日期：</strong>{selectedHomework.dueDate.split('T')[0]}</p>
              <p><strong>作业描述：</strong></p>
              <p style={{ marginLeft: '1rem' }}>{selectedHomework.description}</p>
            </div>
          </div>

          {selectedHomework.submission && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title">已提交内容</h3>
              </div>
              <div className="submission-content">
                {selectedHomework.submission.content && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>作业内容</h4>
                    <p style={{ color: '#4a5568', whiteSpace: 'pre-wrap' }}>
                      {selectedHomework.submission.content}
                    </p>
                  </div>
                )}
                
                {selectedHomework.submission.imageUrl && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>提交图片</h4>
                    <img
                      src={getImageUrl(selectedHomework.submission.imageUrl)}
                      alt="作业"
                      style={{ maxWidth: '100%', borderRadius: '8px' }}
                    />
                  </div>
                )}
                
                {selectedHomework.submission.files && selectedHomework.submission.files.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>
                      附件 ({selectedHomework.submission.files.length} 个文件)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedHomework.submission.files.map((file: any, index: number) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div
                            key={index}
                            style={{
                              padding: '1rem',
                              background: '#f7fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '1.5rem' }}>
                                {isImage ? '🖼️' : '📎'}
                              </span>
                              <div>
                                <div style={{ fontWeight: 500, color: '#2d3748' }}>
                                  {file.name}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                                  {formatFileSize(file.size)}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {isImage && (
                                <a
                                  href={getImageUrl(file.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm"
                                  style={{ textDecoration: 'none' }}
                                >
                                  查看
                                </a>
                              )}
                              <a
                                href={getImageUrl(file.url)}
                                download={file.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-primary"
                                style={{ textDecoration: 'none' }}
                              >
                                下载
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {!selectedHomework.submission.content && !selectedHomework.submission.imageUrl && (!selectedHomework.submission.files || selectedHomework.submission.files.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                    无提交内容
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedHomework.submission?.status === 'graded' && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title">批改结果</h3>
              </div>
              <div className="grading-result">
                <div className="grade-display-large">{selectedHomework.submission.grade}分</div>
                <div className="feedback-section">
                  <h4>教师评语</h4>
                  <p>{selectedHomework.submission.feedback || '暂无评语'}</p>
                </div>
              </div>
            </div>
          )}

          {!selectedHomework.submission && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title">提交作业</h3>
              </div>
              <div className="upload-section">
                <div className="form-group">
                  <label className="form-label">作业内容</label>
                  <textarea
                    className="form-textarea"
                    placeholder="请输入作业内容..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">上传文件（支持图片、代码、Word等）</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.py,.js,.ts,.java,.cpp,.c,.h,.cs,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.json,.xml,.yaml,.yml,.md,.zip,.rar"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(Array.from(e.target.files));
                      }
                    }}
                    style={{ marginTop: '0.5rem' }}
                  />
                  {selectedFiles.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>
                        已选择 {selectedFiles.length} 个文件：
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#f3f4f6',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <span>📎</span>
                            <span>{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ marginTop: '1.5rem', width: '100%' }}
                >
                  {submitting ? '提交中...' : '提交作业'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentHomework;
