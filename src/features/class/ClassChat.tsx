import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { chatApi } from '../../services/chat';
import { classApi } from '../../services/class';

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
  return `http://localhost:3001${url}`;
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
      alert('操作失败');
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
      alert('操作成功');
      loadMessages();
    } catch (err) {
      console.error('禁言操作失败:', err);
      alert('操作失败');
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
      setError(err.response?.data?.error || '加载班级信息失败');
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
      setError(err.response?.data?.error || '发送消息失败');
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

  return (
    <div className="class-chat" style={{ height: '75vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>{className} - 班级群</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          {user?.role === 'teacher' && (
            <button
              onClick={toggleAllMute}
              style={{
                backgroundColor: isAllMuted ? '#fee2e2' : '#fff',
                color: isAllMuted ? '#991b1b' : '#000',
                border: '1px solid #ddd',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isAllMuted ? '🔇 已全体禁言' : '🔇 全体禁言'}
            </button>
          )}
          <button
            onClick={toggleMute}
            style={{
              backgroundColor: isMuted ? '#f0f0f0' : '#fff',
              border: '1px solid #ddd',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isMuted ? '🔕 已静音' : '🔔 免打扰'}
          </button>
        </div>
      </div>

      <div
        ref={chatMessagesRef}
        onScroll={handleScroll}
        className="chat-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>加载中...</div>
        )}

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#991b1b', 
            padding: '1rem', 
            borderRadius: '8px', 
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
            暂无聊天记录，发送第一条消息吧！
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender.id === user.id;
          const imgUrl = getImageUrl(msg.imageUrl);
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                flexDirection: isOwn ? 'row-reverse' : 'row'
              }}
            >
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: isOwn ? '#07c160' : '#12b7f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                flexShrink: 0
              }}>
                {msg.sender.avatar ? (
                  <img
                    src={getImageUrl(msg.sender.avatar)}
                    alt={msg.sender.nickname || msg.sender.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  (msg.sender.nickname?.charAt(0) || msg.sender.name.charAt(0)).toUpperCase()
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!isOwn && (
                    <div style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.25rem' }}>
                      {msg.sender.nickname || msg.sender.name}
                      {msg.sender.isMuted && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>(已禁言)</span>}
                    </div>
                  )}
                  {user?.role === 'teacher' && !isOwn && msg.sender.role === 'student' && (
                    <button
                      onClick={() => handleMuteStudent(msg.sender.id, msg.sender.isMuted)}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.5rem',
                        backgroundColor: msg.sender.isMuted ? '#fee2e2' : '#f0f0f0',
                        color: msg.sender.isMuted ? '#991b1b' : '#000',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {msg.sender.isMuted ? '解禁' : '禁言'}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: isOwn ? '#95ec69' : '#fff',
                    color: '#000',
                    padding: '0.75rem 1rem',
                    borderRadius: isOwn ? '8px 0 8px 8px' : '0 8px 8px 8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.content && <div>{msg.content}</div>}
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt="聊天图片"
                      style={{ maxWidth: '200px', borderRadius: '4px', marginTop: '0.5rem' }}
                    />
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#b2b2b2', textAlign: isOwn ? 'right' : 'left', margin: '0 0.25rem' }}>
                  {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ 
        backgroundColor: '#f7f7f7', 
        padding: '0.75rem 1rem', 
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {user?.role === 'student' && (isAllMuted || user.isMuted) && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            {isAllMuted ? '班级已全体禁言，无法发送消息' : '您已被禁言，无法发送消息'}
          </div>
        )}
        {selectedFile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#e8f5e9',
            borderRadius: '4px'
          }}>
            <span>{selectedFile.name}</span>
            <button
              onClick={removeFile}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#f44336',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
            disabled={user?.role === 'student' && (isAllMuted || user.isMuted)}
            style={{
              backgroundColor: (user?.role === 'student' && (isAllMuted || user.isMuted)) ? '#e0e0e0' : '#f0f0f0',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '50%',
              cursor: (user?.role === 'student' && (isAllMuted || user.isMuted)) ? 'not-allowed' : 'pointer',
              fontSize: '1.2rem'
            }}
          >
            📎
          </button>
          <input
            type="text"
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={user?.role === 'student' && (isAllMuted || user.isMuted)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '20px',
              border: '1px solid #ddd',
              fontSize: '0.95rem',
              outline: 'none',
              backgroundColor: (user?.role === 'student' && (isAllMuted || user.isMuted)) ? '#f5f5f5' : '#fff',
              cursor: (user?.role === 'student' && (isAllMuted || user.isMuted)) ? 'not-allowed' : 'text'
            }}
          />
          <button 
            type="submit" 
            disabled={loading || (user?.role === 'student' && (isAllMuted || user.isMuted))}
            style={{
              backgroundColor: (loading || (user?.role === 'student' && (isAllMuted || user.isMuted))) ? '#ccc' : '#07c160',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: (loading || (user?.role === 'student' && (isAllMuted || user.isMuted))) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '发送中' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClassChat;
