import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { homeworkApi } from '../../services/homework';
import { submissionApi } from '../../services/submission';
import { apiClient } from '../../services/client';
import Icon from '../../components/Icon';

const getImageUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${''}${url}`;
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
  const [aiHelping, setAiHelping] = useState(false);
  const [aiHelpResponse, setAiHelpResponse] = useState('');
  const [aiHelpHomeworkId, setAiHelpHomeworkId] = useState<string | null>(null);

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
        homeworkApi.getHomeworks(),
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

  const handleAiHelp = async (hw: Homework) => {
    try {
      setAiHelping(true);
      setAiHelpHomeworkId(hw.id);
      setAiHelpResponse('');
      const data: any = await apiClient.post('/api/agents/homework-help', {
        homework_id: hw.id,
        question: '请帮我分析这道作业'
      });
      const text =
        data?.response ||
        data?.answer ||
        data?.message ||
        data?.result ||
        (typeof data === 'string' ? data : JSON.stringify(data));
      setAiHelpResponse(text);
    } catch (err: any) {
      setAiHelpResponse(`AI辅导失败: ${err.message || '未知错误'}`);
    } finally {
      setAiHelping(false);
      setAiHelpHomeworkId(null);
    }
  };

  const closeAiHelpPanel = () => {
    setAiHelpResponse('');
    setAiHelpHomeworkId(null);
    setAiHelping(false);
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
              <Icon name="warning" size={22} color="#ef4444" />
              <h3 style={{ margin: 0, color: '#ef4444' }}>紧急提醒！以下作业即将到期</h3>
            </div>
          </div>
          <div style={{ padding: '0 1rem 1rem' }}>
            {urgentHomeworks.map((hw) => (
              <div key={hw.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="fire" size={16} color="#f59e0b" />
                <strong>{hw.title}</strong>
                <span style={{ color: '#ef4444', marginLeft: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Icon name="clock" size={12} color="#ef4444" />
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
            <h2 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="homework" size={24} color="#2563eb" />
              我的作业
            </h2>
          </div>

          {error && <div className="error-message" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="warning" size={16} color="#ef4444" />
            {error}
          </div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#334155' }}>
              <Icon name="loading" size={20} spin />
              加载中...
            </div>
          ) : homeworks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Icon name="info" size={18} />
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
                      backgroundColor: urgent ? 'rgba(239,68,68,0.15)' : undefined
                    }}
                  >
                    <div className="homework-card-header">
                      <div>
                        <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon name="book" size={18} color="#2563eb" />
                          {hw.title}
                        </h4>
                        <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Icon name="code" size={12} />
                          {hw.subject}
                        </span>
                        {urgent && (
                          <span className="badge" style={{ backgroundColor: '#ef4444', color: 'white', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Icon name="fire" size={12} />
                            即将到期
                          </span>
                        )}
                      </div>
                      <span className={`badge ${submission?.status === 'graded' ? 'badge-graded' : 'badge-pending'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {submission?.status === 'graded' ? (
                          <>
                            <Icon name="check" size={12} />
                            已批改
                          </>
                        ) : submission ? (
                          <>
                            <Icon name="check" size={12} />
                            已提交
                          </>
                        ) : (
                          <>
                            <Icon name="clock" size={12} />
                            待提交
                          </>
                        )}
                      </span>
                    </div>
                    <p style={{ color: '#64748b', margin: '1rem 0' }}>{hw.description}</p>
                    <div className="homework-card-footer">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Icon name="user" size={14} color="#334155" />
                        {hw.teacherName || '老师'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Icon name="calendar" size={14} color="#334155" />
                        截止: {hw.dueDate.split('T')[0]}
                      </span>
                      {submission?.grade && (
                        <span className="grade-display" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Icon name="star" size={14} color="#f59e0b" />
                          {submission.grade}分
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAiHelp(hw);
                      }}
                      disabled={aiHelping && aiHelpHomeworkId === hw.id}
                      style={{
                        marginTop: '1rem',
                        padding: '0.6rem 1.2rem',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#2563eb',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        opacity: aiHelping && aiHelpHomeworkId === hw.id ? 0.7 : 1
                      }}
                    >
                      <Icon name="robot" size={16} />
                      {aiHelping && aiHelpHomeworkId === hw.id ? 'AI分析中...' : 'AI辅导'}
                    </button>
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
            <Icon name="link" size={16} style={{ transform: 'rotate(180deg)' }} />
            返回作业列表
          </button>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="homework" size={24} color="#2563eb" />
                {selectedHomework.title}
              </h2>
              <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Icon name="code" size={12} />
                {selectedHomework.subject}
              </span>
            </div>
            <div className="homework-info">
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="user" size={14} color="#334155" />
                <strong>教师：</strong>{selectedHomework.teacherName || '老师'}
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="calendar" size={14} color="#334155" />
                <strong>截止日期：</strong>{selectedHomework.dueDate.split('T')[0]}
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="book" size={14} color="#334155" />
                <strong>作业描述：</strong>
              </p>
              <p style={{ marginLeft: '1rem' }}>{selectedHomework.description}</p>
            </div>
          </div>

          {selectedHomework.submission && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="check" size={20} color="#34d399" />
                  已提交内容
                </h3>
              </div>
              <div className="submission-content">
                {selectedHomework.submission.content && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon name="pen" size={16} color="#2563eb" />
                      作业内容
                    </h4>
                    <p style={{ color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {selectedHomework.submission.content}
                    </p>
                  </div>
                )}

                {selectedHomework.submission.imageUrl && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon name="eye" size={16} color="#2563eb" />
                      提交图片
                    </h4>
                    <img
                      src={getImageUrl(selectedHomework.submission.imageUrl)}
                      alt="作业"
                      style={{ maxWidth: '100%', borderRadius: '8px' }}
                    />
                  </div>
                )}

                {selectedHomework.submission.files && selectedHomework.submission.files.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon name="folder" size={16} color="#2563eb" />
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
                              background: '#f1f5f9',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Icon name={isImage ? 'eye' : 'folder'} size={22} color={isImage ? '#34d399' : '#2563eb'} />
                              <div>
                                <div style={{ fontWeight: 500, color: '#0f172a' }}>
                                  {file.name}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
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
                                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <Icon name="eye" size={14} />
                                  查看
                                </a>
                              )}
                              <a
                                href={getImageUrl(file.url)}
                                download={file.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-primary"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Icon name="download" size={14} />
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
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Icon name="info" size={18} />
                    无提交内容
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedHomework.submission?.status === 'graded' && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="medal" size={20} color="#f59e0b" />
                  批改结果
                </h3>
              </div>
              <div className="grading-result">
                <div className="grade-display-large">{selectedHomework.submission.grade}分</div>
                <div className="feedback-section">
                  <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="chat" size={16} color="#2563eb" />
                    教师评语
                  </h4>
                  <p>{selectedHomework.submission.feedback || '暂无评语'}</p>
                </div>
              </div>
            </div>
          )}

          {!selectedHomework.submission && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="send" size={20} color="#2563eb" />
                  提交作业
                </h3>
              </div>
              <div className="upload-section">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="pen" size={14} />
                    作业内容
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder="请输入作业内容..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="folder" size={14} />
                    上传文件（支持图片、代码、Word等）
                  </label>
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
                      <h4 style={{ marginBottom: '0.5rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Icon name="folder" size={16} color="#2563eb" />
                        已选择 {selectedFiles.length} 个文件：
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#f1f5f9',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Icon name="folder" size={14} color="#2563eb" />
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
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: 0
                              }}
                              aria-label="移除文件"
                            >
                              <Icon name="close" size={14} color="#ef4444" />
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
                  <Icon name={submitting ? 'loading' : 'send'} size={16} spin={submitting} />
                  {submitting ? '提交中...' : '提交作业'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(aiHelping || aiHelpResponse) && (
        <div
          className="card"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: 'min(420px, calc(100vw - 3rem))',
            maxHeight: '60vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            backdropFilter: 'blur(8px)',
            zIndex: 1000
          }}
        >
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#2563eb'
            }}
          >
            <h3 className="card-title" style={{ margin: 0, color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="robot" size={20} color="white" />
              AI辅导
            </h3>
            <button
              type="button"
              onClick={closeAiHelpPanel}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="关闭"
            >
              <Icon name="close" size={16} color="white" />
            </button>
          </div>
          <div
            style={{
              padding: '1rem',
              color: '#334155',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: '0.95rem'
            }}
          >
            {aiHelping ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="ai-loading-dot" style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  animation: 'aiPulse 1s ease-in-out infinite'
                }} />
                正在分析作业，请稍候...
              </span>
            ) : aiHelpResponse}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHomework;
