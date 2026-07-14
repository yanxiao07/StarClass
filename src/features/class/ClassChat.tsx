import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { chatApi } from '../../services/chat';
import { classApi } from '../../services/class';
import Icon from '../../components/Icon';

interface ChatMessage {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    nickname: string | null;
    avatar: string | null;
    role: string;
    isMuted: boolean;
  };
}

const getImageUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url;
};

const ClassChat: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const { user, refreshUser } = useAuth();
  const [className, setClassName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isAllMuted, setIsAllMuted] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (classId && user) {
      const muted = localStorage.getItem(`muted_${user.id}_${classId}`) === 'true';
      setIsMuted(muted);
    }
  }, [classId, user]);

  const toggleMute = () => {
    if (!classId || !user) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem(`muted_${user.id}_${classId}`, newMuted.toString());
  };

  const toggleAllMute = async () => {
    if (!classId || !user || user.role !== 'teacher') return;
    try {
      if (isAllMuted) {
        await chatApi.unmuteAllStudents(classId);
        setIsAllMuted(false);
      } else {
        await chatApi.muteAllStudents(classId);
        setIsAllMuted(true);
      }
    } catch (err) {
      console.error('切换全体禁言失败:', err);
    }
  };

  const handleMuteStudent = async (studentId: string, studentIsMuted: boolean) => {
    if (!classId || !user || user.role !== 'teacher') return;
    try {
      if (studentIsMuted) {
        await chatApi.unmuteStudent(studentId);
      } else {
        await chatApi.muteStudent(studentId);
      }
      loadMessages();
    } catch (err) {
      console.error('禁言操作失败:', err);
    }
  };

  const scrollToBottom = () => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, shouldAutoScroll]);

  const loadMessages = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError('');

      const classInfo = await classApi.getClassById(classId);
      setClassName(classInfo.name);
      if (classInfo.isAllMuted !== undefined) {
        setIsAllMuted(classInfo.isAllMuted);
      }

      try {
        const data = await chatApi.getClassMessages(classId);
        setMessages(data);

        if (user) {
          localStorage.setItem(`lastViewed_${user.id}_${classId}`, new Date().toISOString());
        }
      } catch (err) {
        console.log('聊天记录加载失败');
      }
    } catch (err: any) {
      setError(err.message || '加载班级信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [classId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refreshUser();
      }
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [classId, user, refreshUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || (!newMessage.trim() && !selectedFile)) return;

    try {
      setLoading(true);
      setError('');
      setShouldAutoScroll(true);
      const message = await chatApi.sendClassMessage(classId, {
        content: newMessage.trim() || undefined,
        file: selectedFile || undefined
      });
      setMessages([...messages, message]);
      setNewMessage('');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || '发送消息失败');
      if (user) {
        refreshUser();
      }
      loadMessages();
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  if (!user || !classId) return null;

  const isStudentMuted = user?.role === 'student' && (isAllMuted || user.isMuted);

  return (
    <div className="card" style={{ height: '75vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      {/* 聊天头部 */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="chat" size={20} color="#2563eb" />
          {className} - 班级群
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {user?.role === 'teacher' && (
            <button
              onClick={toggleAllMute}
              className="btn"
              style={{
                backgroundColor: isAllMuted ? 'rgba(239,68,68,0.1)' : '#f1f5f9',
                color: isAllMuted ? '#ef4444' : '#334155',
                border: '1px solid #e2e8f0',
                padding: '0.375rem 0.875rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Icon name="lock" size={14} color={isAllMuted ? '#ef4444' : '#334155'} />
              {isAllMuted ? '已禁言' : '全体禁言'}
            </button>
          )}
          <button
            onClick={toggleMute}
            className="btn"
            style={{
              backgroundColor: isMuted ? '#e2e8f0' : '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '0.375rem 0.875rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <Icon name="bell" size={14} color="#334155" />
            {isMuted ? '已静音' : '免打扰'}
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div
        ref={chatMessagesRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Icon name="loading" size={18} color="#64748b" spin />
            加载中...
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <Icon name="chat" size={40} color="#94a3b8" />
            暂无聊天记录，发送第一条消息吧！
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender.id === user.id;
          const imgUrl = getImageUrl(msg.imageUrl);
          const senderName = msg.sender.nickname || msg.sender.name;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.625rem',
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                flexDirection: isOwn ? 'row-reverse' : 'row',
              }}
            >
              {/* 头像 */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isOwn
                  ? '#2563eb'
                  : '#0ea5e9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {msg.sender.avatar ? (
                  <img src={getImageUrl(msg.sender.avatar)} alt={senderName}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  senderName.charAt(0).toUpperCase()
                )}
              </div>

              {/* 消息内容 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '100%' }}>
                {/* 发送者名称 + 禁言按钮 */}
                {!isOwn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {senderName}
                      {msg.sender.isMuted && (
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}>
                          <Icon name="lock" size={11} color="#ef4444" />
                          (已禁言)
                        </span>
                      )}
                    </span>
                    {user?.role === 'teacher' && msg.sender.role === 'student' && (
                      <button
                        onClick={() => handleMuteStudent(msg.sender.id, msg.sender.isMuted)}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          backgroundColor: msg.sender.isMuted ? 'rgba(239,68,68,0.1)' : '#f1f5f9',
                          color: msg.sender.isMuted ? '#ef4444' : '#64748b',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Icon
                          name={msg.sender.isMuted ? 'check' : 'lock'}
                          size={11}
                          color={msg.sender.isMuted ? '#ef4444' : '#64748b'}
                        />
                        {msg.sender.isMuted ? '解禁' : '禁言'}
                      </button>
                    )}
                  </div>
                )}

                {/* 气泡 */}
                <div style={{
                  background: isOwn
                    ? '#2563eb'
                    : '#f1f5f9',
                  color: isOwn ? '#ffffff' : '#0f172a',
                  padding: '0.625rem 1rem',
                  borderRadius: isOwn ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  border: isOwn ? 'none' : '1px solid #e2e8f0',
                  wordBreak: 'break-word',
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  boxShadow: isOwn ? '0 2px 8px rgba(37,99,235,0.2)' : 'none',
                }}>
                  {msg.content && <div>{msg.content}</div>}
                  {imgUrl && (
                    <img src={imgUrl} alt="图片"
                      style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '0.5rem', display: 'block' }} />
                  )}
                </div>

                {/* 时间 */}
                <div style={{
                  fontSize: '0.6875rem',
                  color: '#94a3b8',
                  textAlign: isOwn ? 'right' : 'left',
                  padding: '0 0.25rem',
                }}>
                  {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #e2e8f0',
        flexShrink: 0,
      }}>
        {isStudentMuted && (
          <div className="error-message" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
            {isAllMuted ? '班级已全体禁言，无法发送消息' : '您已被禁言，无法发送消息'}
          </div>
        )}
        {selectedFile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: '8px',
            marginBottom: '0.5rem',
            fontSize: '0.8125rem',
            color: '#334155',
          }}>
            <Icon name="link" size={14} color="#2563eb" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
            <button onClick={removeFile}
              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <Icon name="close" size={16} color="#ef4444" />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.py,.js,.ts,.java,.cpp,.c,.h,.cs,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.json,.xml,.yaml,.yml,.md,.zip,.rar"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStudentMuted}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              cursor: isStudentMuted ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: isStudentMuted ? 0.4 : 1,
            }}
          >
            <Icon name="link" size={18} color="#334155" />
          </button>
          <input
            type="text"
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isStudentMuted}
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.9375rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          />
          <button
            type="submit"
            disabled={loading || isStudentMuted}
            style={{
              background: (loading || isStudentMuted)
                ? '#e2e8f0'
                : '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.625rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: (loading || isStudentMuted) ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: (loading || isStudentMuted) ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {loading
              ? <Icon name="loading" size={16} color="#ffffff" spin />
              : <Icon name="send" size={16} color="#ffffff" />}
            {loading ? '发送中' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClassChat;
