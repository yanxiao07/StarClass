import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../services/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
}

const AgentChat: React.FC = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await apiClient.get<any[]>('/api/agents');
      setAgents(data);
      if (data.length > 0) {
        setSelectedAgent(data[0]);
      }
    } catch (error) {
      console.error('加载智能体失败:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || !selectedAgent || !user) return;

    setIsLoading(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response: { conversation_id?: string; response?: string } = await apiClient.post(`/api/agents/${selectedAgent.id}/chat`, {
        message: inputMessage,
        conversation_id: conversationId,
        class_id: user.classId,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const assistantMessage: Message = {
        id: Date.now().toString() + '_assistant',
        role: 'assistant',
        content: response.response || '抱歉，我无法回答这个问题。',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: '发送失败，请重试。',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAgentIcon = (type: string) => {
    const icons: Record<string, string> = {
      teaching_assistant: '📝',
      study_coach: '🎓',
      creative_writer: '✍️',
      code_coach: '💻',
    };
    return icons[type] || '🤖';
  };

  const getAgentColor = (type: string) => {
    const colors: Record<string, string> = {
      teaching_assistant: '#8B5CF6',
      study_coach: '#6366F1',
      creative_writer: '#EC4899',
      code_coach: '#06B6D4',
    };
    return colors[type] || '#8B5CF6';
  };

  if (!user) return null;

  return (
    <div className="agent-chat-container" style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '20px' }}>
      <div
        style={{
          width: '280px',
          background: '#1a1a2e',
          borderRadius: '16px',
          padding: '20px',
          overflowY: 'auto'
        }}
      >
        <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '18px' }}>AI 智能体</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => {
                setSelectedAgent(agent);
                setMessages([]);
                setConversationId(null);
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
                backgroundColor: selectedAgent?.id === agent.id ? getAgentColor(agent.type) : 'rgba(255,255,255,0.05)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{getAgentIcon(agent.type)}</span>
                <div>
                  <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{agent.name}</div>
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{agent.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: '#1a1a2e',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {selectedAgent ? (
          <>
            <div
              style={{
                padding: '20px',
                background: getAgentColor(selectedAgent.type),
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '32px' }}>{getAgentIcon(selectedAgent.type)}</span>
              <div>
                <h2 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>{selectedAgent.name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '4px 0 0' }}>{selectedAgent.description}</p>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                  <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>{getAgentIcon(selectedAgent.type)}</span>
                  <p>欢迎与 {selectedAgent.name} 交流！</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>{selectedAgent.description}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: message.role === 'user' ? getAgentColor(selectedAgent.type) : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '14px',
                        lineHeight: '1.6',
                      }}
                    >
                      <div style={{ marginBottom: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        {message.role === 'user' ? '我' : selectedAgent.name}
                      </div>
                      <div>{message.content}</div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                        {message.timestamp}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div
              style={{
                padding: '20px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: getAgentColor(selectedAgent.type),
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  {isLoading ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            <p>请选择一个智能体开始对话</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentChat;