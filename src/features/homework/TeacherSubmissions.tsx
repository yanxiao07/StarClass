import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { submissionApi, Submission } from '../../services/submission';
import { userApi } from '../../services/user';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/client';

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
  className: string;
}

const TeacherSubmissions: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(searchParams.get('homeworkId'));
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [abilityScores, setAbilityScores] = useState({
    homeworkCompletion: '',
    accuracy: '',
    participation: '',
    creativity: '',
    teamwork: '',
    improvement: ''
  });
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [rewarding, setRewarding] = useState(false);
  const [error, setError] = useState('');

  const loadHomeworks = async () => {
    try {
      const data = await apiClient.get<Homework[]>('/api/homework');
      setHomeworks(data);
    } catch (err: any) {
      console.error('加载作业列表失败:', err);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await submissionApi.getSubmissions(selectedHomeworkId || undefined);
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || '加载提交失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeworks();
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [selectedHomeworkId]);

  const handleDownload = async (file: any) => {
    try {
      const url = getImageUrl(file.url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmission || !grade) return;

    setGrading(true);
    try {
      await submissionApi.gradeSubmission(selectedSubmission.id, {
        grade: parseInt(grade),
        feedback,
        homeworkCompletion: abilityScores.homeworkCompletion ? parseInt(abilityScores.homeworkCompletion) : null,
        accuracy: abilityScores.accuracy ? parseInt(abilityScores.accuracy) : null,
        participation: abilityScores.participation ? parseInt(abilityScores.participation) : null,
        creativity: abilityScores.creativity ? parseInt(abilityScores.creativity) : null,
        teamwork: abilityScores.teamwork ? parseInt(abilityScores.teamwork) : null,
        improvement: abilityScores.improvement ? parseInt(abilityScores.improvement) : null
      });
      alert('评分成功！');
      setSelectedSubmission(null);
      setGrade('');
      setFeedback('');
      setAbilityScores({
        homeworkCompletion: '',
        accuracy: '',
        participation: '',
        creativity: '',
        teamwork: '',
        improvement: ''
      });
      loadSubmissions();
    } catch (err: any) {
      setError(err.message || '评分失败');
    } finally {
      setGrading(false);
    }
  };

  const handleRewardStars = async (stars: number) => {
    if (!selectedSubmission || !selectedSubmission.student) return;

    setRewarding(true);
    try {
      await userApi.rewardStars(selectedSubmission.student.id, stars);
      alert(`成功奖励 ${stars} 颗星星！`);
    } catch (err: any) {
      setError(err.message || '奖励失败');
    } finally {
      setRewarding(false);
    }
  };

  if (!user) return null;

  return (
    <div className="submissions-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">作业批改</h2>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">选择作业</label>
          <select
            className="form-select"
            value={selectedHomeworkId || ''}
            onChange={(e) => {
              setSelectedHomeworkId(e.target.value || null);
              setSelectedSubmission(null);
            }}
          >
            <option value="">全部作业</option>
            {homeworks.map((hw) => (
              <option key={hw.id} value={hw.id}>
                {hw.title} - {hw.className}
              </option>
            ))}
          </select>
        </div>

        {!selectedSubmission ? (
          <div className="submissions-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div>
            ) : submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                暂无待批改的作业
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="submission-item"
                  onClick={() => {
                    setSelectedSubmission(sub);
                    setGrade(sub.grade?.toString() || '');
                    setFeedback(sub.feedback || '');
                    setAbilityScores({
                      homeworkCompletion: sub.homeworkCompletion?.toString() || '',
                      accuracy: sub.accuracy?.toString() || '',
                      participation: sub.participation?.toString() || '',
                      creativity: sub.creativity?.toString() || '',
                      teamwork: sub.teamwork?.toString() || '',
                      improvement: sub.improvement?.toString() || ''
                    });
                  }}
                >
                  <div className="submission-info">
                    <div className="student-name">{sub.student?.name || '未知学生'}</div>
                    <div className="homework-title">{sub.homework?.title || '未知作业'}</div>
                    <div className="submission-time">提交于 {new Date(sub.submittedAt).toLocaleString()}</div>
                  </div>
                  <div className="submission-status">
                    <span className={`badge ${sub.status === 'graded' ? 'badge-graded' : 'badge-pending'}`}>
                      {sub.status === 'graded' ? '已批改' : '待批改'}
                    </span>
                    {sub.grade && (
                      <span className="grade-display">{sub.grade}分</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grading-panel">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedSubmission(null);
                setGrade('');
                setFeedback('');
              }}
              style={{ marginBottom: '1.5rem' }}
            >
              ← 返回列表
            </button>

            <div className="grid grid-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    {selectedSubmission.student?.name} - {selectedSubmission.homework?.title}
                  </h3>
                </div>
                <div className="submission-content">
                  {selectedSubmission.content && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>作业内容</h4>
                      <p style={{ color: '#4a5568', whiteSpace: 'pre-wrap' }}>
                        {selectedSubmission.content}
                      </p>
                    </div>
                  )}
                  
                  {selectedSubmission.imageUrl && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>提交图片</h4>
                      <img
                        src={getImageUrl(selectedSubmission.imageUrl)}
                        alt="作业"
                        style={{ maxWidth: '100%', borderRadius: '8px' }}
                      />
                    </div>
                  )}
                  
                  {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#2d3748' }}>
                        附件 ({selectedSubmission.files.length} 个文件)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedSubmission.files.map((file, index) => {
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
                                <button
                                  type="button"
                                  onClick={() => handleDownload(file)}
                                  className="btn btn-sm btn-primary"
                                >
                                  下载
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {!selectedSubmission.content && !selectedSubmission.imageUrl && (!selectedSubmission.files || selectedSubmission.files.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                      无提交内容
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">批改</h3>
                </div>

                <div className="form-group">
                  <label className="form-label">评分 (0-100)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    min="0"
                    max="100"
                    placeholder="输入分数"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">评语</label>
                  <textarea
                    className="form-textarea"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="写下您的评语..."
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#2d3748' }}>能力维度打分 (0-100)</h4>
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label">作业完成度</label>
                      <input
                        type="number"
                        className="form-input"
                        value={abilityScores.homeworkCompletion}
                        onChange={(e) => setAbilityScores(prev => ({ ...prev, homeworkCompletion: e.target.value }))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">正确率</label>
                      <input
                        type="number"
                        className="form-input"
                        value={abilityScores.accuracy}
                        onChange={(e) => setAbilityScores(prev => ({ ...prev, accuracy: e.target.value }))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">参与度</label>
                      <input
                        type="number"
                        className="form-input"
                        value={abilityScores.participation}
                        onChange={(e) => setAbilityScores(prev => ({ ...prev, participation: e.target.value }))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">创新思维</label>
                      <input
                        type="number"
                        className="form-input"
                        value={abilityScores.creativity}
                        onChange={(e) => setAbilityScores(prev => ({ ...prev, creativity: e.target.value }))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">团队协作</label>
                      <input
                        type="number"
                        className="form-input"
                        value={abilityScores.teamwork}
                        onChange={(e) => setAbilityScores(prev => ({ ...prev, teamwork: e.target.value }))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">进步速度</label>
                      <input
                        type="number"
                        className="form-input"
                        value={abilityScores.improvement}
                        onChange={(e) => setAbilityScores(prev => ({ ...prev, improvement: e.target.value }))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="reward-section">
                  <h4 style={{ marginBottom: '1rem', color: '#2d3748' }}>奖励</h4>
                  <div className="reward-buttons">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRewardStars(1)}
                      disabled={rewarding}
                    >
                      ⭐ +1 星星
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRewardStars(3)}
                      disabled={rewarding}
                    >
                      ⭐ +3 星星
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRewardStars(5)}
                      disabled={rewarding}
                    >
                      ⭐ +5 星星
                    </button>
                  </div>
                </div>

                <button
                  className="btn btn-success"
                  onClick={handleGrade}
                  disabled={grading}
                  style={{ marginTop: '1.5rem', width: '100%' }}
                >
                  {grading ? '提交中...' : '提交批改'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSubmissions;
