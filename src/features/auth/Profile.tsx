import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { userApi } from '../../services/user';
import { authApi } from '../../services/auth';

const getImageUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${import.meta.env.VITE_API_URL || ''}${url}`;
};

// 商城头像框 emoji 映射（与后端 STORE_ITEMS 的 icon 一致）
const AVATAR_EMOJI: Record<string, string> = {
  avatar_cat: '🐱',
  avatar_robot: '🤖',
};

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [editingNickname, setEditingNickname] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const updatedUser = await userApi.updateProfile({ nickname: nickname.trim() });
      updateUser(updatedUser);
      setEditingNickname(false);
      alert('昵称修改成功！');
    } catch (err: any) {
      setError(err.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      setError('');
      try {
        const result = await authApi.uploadAvatar(e.target.files[0]);
        updateUser(result.user);
        alert('头像上传成功！');
      } catch (err: any) {
        setError(err.response?.data?.error || '上传失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('确定要注销账户吗？此操作不可恢复！')) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await userApi.deleteAccount();
      alert('账户已成功注销！');
      logout();
    } catch (err: any) {
      setError(err.response?.data?.error || '注销账户失败');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">个人中心</h2>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="profile-content">
          <div className="profile-avatar">
            {user.activeAvatar && AVATAR_EMOJI[user.activeAvatar] ? (
              <div
                className="avatar-circle"
                style={{ width: '80px', height: '80px', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}
              >
                {AVATAR_EMOJI[user.activeAvatar]}
              </div>
            ) : user.avatar ? (
              <img
                src={getImageUrl(user.avatar)}
                alt="头像"
                className="avatar-circle"
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div className="avatar-circle">
                {user.nickname?.charAt(0).toUpperCase() || user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">昵称</span>
              {editingNickname ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem' }}
                  />
                  <button onClick={handleUpdateNickname} className="btn btn-primary" disabled={loading}>
                    保存
                  </button>
                  <button onClick={() => setEditingNickname(false)} className="btn" disabled={loading}>
                    取消
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="info-value">{user.nickname || '未设置'}</span>
                  <button onClick={() => setEditingNickname(true)} className="btn btn-sm">
                    修改
                  </button>
                </div>
              )}
            </div>

            <div className="info-row">
              <span className="info-label">头像</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-sm"
                  disabled={loading}
                >
                  {loading ? '上传中...' : '选择图片'}
                </button>
              </div>
            </div>

            <div className="info-row">
              <span className="info-label">姓名</span>
              <span className="info-value">{user.name}</span>
            </div>

            <div className="info-row">
              <span className="info-label">邮箱</span>
              <span className="info-value">{user.email}</span>
            </div>

            <div className="info-row">
              <span className="info-label">身份</span>
              <span className="info-value badge badge-pending">
                {user.role === 'teacher' ? '教师' : '学生'}
              </span>
            </div>

            {user.role === 'student' && (
              <>
                <div className="info-row">
                  <span className="info-label">班级</span>
                  <span className="info-value">{user.className}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">学号</span>
                  <span className="info-value">{user.studentId}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">星星</span>
                  <span className="info-value">{user.stars || 0}</span>
                </div>
              </>
            )}

            <div className="info-row">
              <span className="info-label">注册时间</span>
              <span className="info-value">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}
              </span>
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={logout} className="btn btn-danger">
              退出登录
            </button>
            <button
              onClick={handleDeleteAccount}
              className="btn btn-secondary"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              disabled={deleting}
            >
              {deleting ? '注销中...' : '注销账户'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
