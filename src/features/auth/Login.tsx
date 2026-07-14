import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Icon from '../../components/Icon';
import '../../styles/Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>
            <Icon name="star" size={32} color="#f59e0b" />
            星学园
          </h1>
          <p>登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              <Icon name="warning" size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">邮箱/学号</label>
            <input
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="请输入您的邮箱或学号"
            />
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
              学生可以使用学号或邮箱登录，教师使用邮箱登录
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Icon name="loading" size={16} spin /> 登录中...
              </>
            ) : (
              <>
                <Icon name="login" size={16} /> 登录
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>还没有账户？ <Link to="/register">立即注册</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
