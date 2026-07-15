import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../services/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const getImageUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${import.meta.env.VITE_API_URL || ''}${url}`;
};

// 商城头像框 emoji 映射
const AVATAR_EMOJI: Record<string, string> = {
  avatar_cat: '🐱',
  avatar_robot: '🤖',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatResponse {
  content: string;
}

const AIChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');

  const getStorageKey = () => {
    return user ? `ai_chat_${user.id}` : 'ai_chat_guest';
  };

  useEffect(() => {
    const savedMessages = localStorage.getItem(getStorageKey());
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('加载聊天记录失败:', e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(getStorageKey(), JSON.stringify(messages));
    }
  }, [messages, user]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError('');

    try {
      const response = await apiClient.post<AIChatResponse>('/api/ai/chat', {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })).concat({
          role: 'user',
          content: input
        })
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('AI聊天错误:', err);
      setError(err.message || 'AI服务暂时不可用，请稍后重试');
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    if (window.confirm('确定要开启新对话吗？当前对话记录将被保存。')) {
      setMessages([]);
    }
  };

  const bubbleClass = user?.chatBubbleStyle ? `bubble-${user.chatBubbleStyle}` : '';

  if (!user) return null;

  return (
    <div className="ai-chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-avatar">🤖</div>
          <div className="chat-title">
            <h2>AI 学习助手</h2>
            <p className="chat-subtitle">有什么问题随时问我</p>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <span className="btn-icon">✨</span>
            新对话
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>👋</div>
              <h3 style={{ marginBottom: '0.5rem', color: '#0f172a', fontSize: '1.125rem', fontWeight: 500 }}>
                嗨，我是你的AI学习助手！
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                有什么问题随时问我，我会耐心细致地帮你解答～
              </p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? (
                  user?.activeAvatar && AVATAR_EMOJI[user.activeAvatar] ? (
                    <span style={{ fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
                      {AVATAR_EMOJI[user.activeAvatar]}
                    </span>
                  ) : user?.avatar ? (
                    <img
                      src={getImageUrl(user.avatar)}
                      alt="头像"
                      className="avatar-img"
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    user?.nickname?.charAt(0).toUpperCase() || user?.name.charAt(0).toUpperCase()
                  )
                ) : (
                  '🤖'
                )}
              </div>
              <div className="message-content">
                <div className={`message-bubble ${msg.role === 'user' ? bubbleClass : ''}`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              className="code-block"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-bubble typing">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <div className="input-wrapper">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="输入你的问题..."
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
