import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../services/client';
import Icon from '../../components/Icon';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  streaming?: boolean;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface LLMStatus {
  available: boolean;
  providers: Array<{ provider: string; model: string }>;
  primary: string | null;
}

const AGENT_ICONS: Record<string, string> = {
  teaching_assistant: 'robot',
  study_coach: 'book',
  creative_writer: 'pen',
  code_coach: 'code',
};

const AGENT_COLORS: Record<string, string> = {
  teaching_assistant: '#2563eb',
  study_coach: '#10b981',
  creative_writer: '#f59e0b',
  code_coach: '#0ea5e9',
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
  ollama: 'Ollama本地',
};

const SUGGESTIONS: Record<string, string[]> = {
  teaching_assistant: ['分析班级作业情况', '哪些学生需要关注？', '帮我生成教学建议'],
  study_coach: ['制定学习计划', '分析我的薄弱点', '推荐学习方法'],
  creative_writer: ['帮我构思作文', '写作技巧指导', '润色我的文章'],
  code_coach: ['分析我的代码', 'Python常见错误', '如何调试程序？'],
};

const AgentChat: React.FC = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<LLMStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadAgents();
    loadLLMStatus();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await apiClient.get<any[]>('/api/agents');
      setAgents(data);
      if (data.length > 0) {
        const defaultAgent = user?.role === 'teacher'
          ? data.find(a => a.type === 'teaching_assistant') || data[0]
          : data.find(a => a.type === 'study_coach') || data[0];
        setSelectedAgent(defaultAgent);
      }
    } catch (error) {
      console.error('加载智能体失败:', error);
    }
  };

  const loadLLMStatus = async () => {
    try {
      const data = await apiClient.get<LLMStatus>('/api/agents/llm/status');
      setLlmStatus(data);
    } catch {
      // 忽略错误
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (msgText?: string) => {
    const text = msgText || inputMessage;
    if (!text.trim() || !selectedAgent || !user || isLoading) return;

    setIsLoading(true);
    const userMsgId = Date.now().toString();
    const assistantMsgId = userMsgId + '_assistant';

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputMessage('');

    // 使用 AbortController 支持取消
    abortControllerRef.current = new AbortController();

    try {
      // 获取 token
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/agents/${selectedAgent.id}/stream-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          class_id: user.classId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(line.slice(6));

              if (chunk.type === 'token') {
                fullResponse += chunk.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: fullResponse }
                      : m
                  )
                );
              } else if (chunk.type === 'done') {
                if (chunk.conversationId) {
                  setConversationId(chunk.conversationId);
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, streaming: false }
                      : m
                  )
                );
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 如果流式没有返回内容，回退到非流式
      if (!fullResponse) {
        const result: any = await apiClient.post(`/api/agents/${selectedAgent.id}/chat`, {
          message: text,
          conversation_id: conversationId,
          class_id: user.classId,
        });

        const convId = result.conversationId || result.conversation_id;
        if (convId) setConversationId(convId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: result.response || '抱歉，我无法回答这个问题。', streaming: false }
              : m
          )
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消
      } else {
        console.error('发送消息失败:', error);
        // 回退到非流式 API
        try {
          const result: any = await apiClient.post(`/api/agents/${selectedAgent.id}/chat`, {
            message: text,
            conversation_id: conversationId,
            class_id: user.classId,
          });

          const convId = result.conversationId || result.conversation_id;
          if (convId) setConversationId(convId);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: result.response || '发送失败，请重试。', streaming: false }
                : m
            )
          );
        } catch {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: '发送失败，请重试。', streaming: false }
                : m
            )
          );
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setConversationId(null);
  };

  if (!user) return null;

  const suggestions = selectedAgent ? SUGGESTIONS[selectedAgent.type] || [] : [];
  const agentColor = selectedAgent ? AGENT_COLORS[selectedAgent.type] || '#2563eb' : '#2563eb';
  const llmLabel = llmStatus?.available && llmStatus.primary
    ? PROVIDER_LABELS[llmStatus.primary] || llmStatus.primary
    : '规则引擎';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.25rem' }}>
      {/* 左侧：智能体列表 */}
      <div className="card" style={{ width: '260px', padding: '1.25rem', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            <Icon name="agent" size={18} color="#2563eb" />
            AI 智能体
          </h3>
          {/* LLM 状态指示灯 */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '6px', fontSize: '0.6875rem',
            background: llmStatus?.available ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: llmStatus?.available ? '#10b981' : '#f59e0b',
            border: `1px solid ${llmStatus?.available ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: llmStatus?.available ? '#10b981' : '#f59e0b',
            }} />
            {llmLabel}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {agents.map((agent) => {
            const isSelected = selectedAgent?.id === agent.id;
            const color = AGENT_COLORS[agent.type] || '#2563eb';
            return (
              <div
                key={agent.id}
                onClick={() => selectAgent(agent)}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isSelected
                    ? `linear-gradient(135deg, ${color}33, ${color}11)`
                    : '#f8fafc',
                  border: isSelected ? `1px solid ${color}55` : '1px solid #e2e8f0',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                    border: `1px solid ${color}44`,
                  }}>
                    <Icon name={AGENT_ICONS[agent.type] || 'robot'} size={18} color={color} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.8125rem' }}>{agent.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.6875rem', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agent.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧：聊天区域 */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {selectedAgent ? (
          <>
            {/* 头部 */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              flexShrink: 0,
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: agentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={AGENT_ICONS[selectedAgent.type] || 'robot'} size={22} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ color: '#0f172a', fontSize: '1rem', margin: 0, fontWeight: 600 }}>{selectedAgent.name}</h2>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '2px 0 0' }}>{selectedAgent.description}</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.6875rem',
                  background: user.role === 'teacher' ? 'rgba(37,99,235,0.1)' : 'rgba(245,158,11,0.1)',
                  color: user.role === 'teacher' ? '#2563eb' : '#f59e0b',
                  border: `1px solid ${user.role === 'teacher' ? 'rgba(37,99,235,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}>
                  {user.role === 'teacher' ? '教师视角' : '学生视角'}
                </span>
              </div>
            </div>

            {/* 消息列表 */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '16px',
                    background: agentColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>
                    <Icon name={AGENT_ICONS[selectedAgent.type] || 'robot'} size={32} color="#ffffff" />
                  </div>
                  <p style={{ color: '#0f172a', fontSize: '0.9375rem' }}>欢迎与 {selectedAgent.name} 交流！</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                    {llmStatus?.available
                      ? `当前由 ${llmLabel} 驱动，支持上下文感知对话`
                      : '当前使用规则引擎，配置 LLM API Key 后可获得更强能力'}
                  </p>
                  {suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.5rem 0.875rem', borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#334155',
                            fontSize: '0.8125rem', cursor: 'pointer',
                          }}
                        >
                          <Icon name="sparkle" size={14} color={agentColor} />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex', gap: '0.625rem',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {message.role === 'assistant' && (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: agentColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon name={AGENT_ICONS[selectedAgent.type] || 'robot'} size={18} color="#ffffff" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '70%',
                      padding: '0.625rem 1rem',
                      borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: message.role === 'user'
                        ? '#2563eb'
                        : '#f1f5f9',
                      border: message.role === 'user' ? 'none' : '1px solid #e2e8f0',
                      color: message.role === 'user' ? '#ffffff' : '#0f172a',
                      fontSize: '0.875rem', lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {message.content || (message.streaming ? (
                        <span style={{ display: 'inline-flex', gap: '4px' }}>
                          <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: message.role === 'user' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)', animation: 'pulse 1s infinite' }} />
                          <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: message.role === 'user' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)', animation: 'pulse 1s infinite 0.2s' }} />
                          <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: message.role === 'user' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)', animation: 'pulse 1s infinite 0.4s' }} />
                        </span>
                      ) : '')}
                      {/* 流式光标 */}
                      {message.streaming && message.content && (
                        <span style={{
                          display: 'inline-block', width: '2px', height: '0.875rem',
                          background: agentColor, marginLeft: '2px',
                          animation: 'blink 0.8s infinite', verticalAlign: 'middle',
                        }} />
                      )}
                      {!message.streaming && (
                        <div style={{
                          marginTop: '0.375rem', fontSize: '0.6875rem',
                          color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                          textAlign: 'right',
                        }}>
                          {message.timestamp}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid #e2e8f0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '0.625rem 1rem', borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#0f172a', fontSize: '0.875rem', outline: 'none',
                  }}
                />
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.625rem 1.5rem', borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f1f5f9',
                      color: '#0f172a', fontSize: '0.875rem', fontWeight: 500,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <Icon name="close" size={16} color="#0f172a" />
                    停止
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.625rem 1.5rem', borderRadius: '10px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff', fontSize: '0.875rem', fontWeight: 500,
                      cursor: 'pointer', flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                    }}
                  >
                    <Icon name="send" size={16} color="#ffffff" />
                    发送
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#64748b' }}>
            <Icon name="chat" size={48} color="#94a3b8" />
            <p>请选择一个智能体开始对话</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AgentChat;
