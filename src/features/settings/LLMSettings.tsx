import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { llmApi, ProviderTemplate, LLMConfig } from '../../services/llm';
import { classApi } from '../../services/class';

interface ClassInfo {
  id: string;
  name: string;
  classCode: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: '🟢 DeepSeek',
  qwen: '🔵 通义千问',
  openai: '🟣 OpenAI',
  ollama: '🟠 Ollama 本地',
  custom: '⚙️ 自定义中转站',
};

const LLMSettings: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderTemplate[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<LLMConfig | null>(null);

  const [provider, setProvider] = useState('deepseek');
  const [modelName, setModelName] = useState('deepseek-chat');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2000');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (user?.role !== 'teacher') return;
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedClassId !== undefined) {
      loadConfig(selectedClassId);
    }
  }, [selectedClassId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [providerList, classList] = await Promise.all([
        llmApi.getProviders(),
        classApi.getTeacherClasses(),
      ]);
      setProviders(providerList);
      setClasses((classList as any[]).map(c => ({ id: c.id, name: c.name, classCode: c.classCode })));
      setSelectedClassId(''); // 默认全局配置
    } catch (e: any) {
      showToast('error', `加载失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async (classId: string) => {
    try {
      const cfg = await llmApi.getConfig(classId || undefined);
      setCurrentConfig(cfg);
      if (cfg.configured) {
        setProvider(cfg.provider || 'deepseek');
        setModelName(cfg.model_name || 'deepseek-chat');
        setApiKey(''); // 出于安全考虑不回显 Key
        setBaseUrl(cfg.base_url || '');
        setTestResult(null);
      } else {
        resetForm();
      }
    } catch (e: any) {
      showToast('error', `加载配置失败：${e.message}`);
    }
  };

  const resetForm = () => {
    const p = providers.find(p => p.provider === 'deepseek') || providers[0];
    if (p) {
      setProvider(p.provider);
      setModelName(p.default_model);
      setApiKey('');
      setBaseUrl(p.default_base_url);
    }
    setTemperature('0.7');
    setMaxTokens('2000');
    setCurrentConfig(null);
    setTestResult(null);
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const tpl = providers.find(p => p.provider === newProvider);
    if (tpl) {
      setModelName(tpl.default_model);
      setBaseUrl(tpl.default_base_url);
      setTestResult(null);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleTest = async () => {
    if (!modelName.trim()) {
      showToast('error', '请填写模型名称');
      return;
    }
    const tpl = providers.find(p => p.provider === provider);
    if (tpl?.needs_api_key && !apiKey && !currentConfig?.has_api_key) {
      showToast('error', '请填写 API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const result = await llmApi.testConnection({
        provider,
        model_name: modelName,
        api_key: apiKey || undefined, // 不填则后端使用已保存的 Key
        base_url: baseUrl || undefined,
      });
      setTestResult({ success: result.success, message: result.message });
    } catch (e: any) {
      setTestResult({ success: false, message: `测试请求失败：${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!modelName.trim()) {
      showToast('error', '请填写模型名称');
      return;
    }
    const tpl = providers.find(p => p.provider === provider);
    if (tpl?.needs_api_key && !apiKey && !currentConfig?.has_api_key) {
      showToast('error', '请填写 API Key');
      return;
    }

    setSaving(true);
    try {
      await llmApi.saveConfig({
        provider,
        model_name: modelName,
        api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
        temperature,
        max_tokens: maxTokens,
        class_id: selectedClassId || null,
      });
      showToast('success', '配置保存成功');
      // 重新加载配置以同步 has_api_key 状态
      await loadConfig(selectedClassId);
      setApiKey('');
    } catch (e: any) {
      showToast('error', `保存失败：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentConfig?.configured) {
      showToast('error', '当前无配置可删除');
      return;
    }
    if (!confirm('确定要删除该配置吗？删除后将恢复使用规则引擎。')) return;

    try {
      await llmApi.deleteConfig(selectedClassId || undefined);
      showToast('success', '配置已删除');
      resetForm();
      await loadConfig(selectedClassId);
    } catch (e: any) {
      showToast('error', `删除失败：${e.message}`);
    }
  };

  if (user?.role !== 'teacher') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        只有教师可以访问 AI 配置页面
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>加载中...</div>
      </div>
    );
  }

  const selectedTpl = providers.find(p => p.provider === provider);
  const scopeLabel = selectedClassId
    ? `班级专属配置（${classes.find(c => c.id === selectedClassId)?.name || ''}）`
    : '全局默认配置（所有班级共用）';

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: toast.type === 'success' ? '#10b981' : '#ef4444',
            backdropFilter: 'blur(8px)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          ⚙️ AI 模型配置
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          为你的班级配置大模型，支持 DeepSeek、通义千问、OpenAI、Ollama 及自定义中转站。未配置时使用规则引擎。
        </p>
      </div>

      {/* 配置范围切换 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <label style={{ display: 'block', marginBottom: '12px', color: '#334155', fontSize: '14px', fontWeight: 600 }}>
          配置范围
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedClassId('')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${!selectedClassId ? 'rgba(37, 99, 235, 0.5)' : '#e2e8f0'}`,
              background: !selectedClassId ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: !selectedClassId ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            🌐 全局默认
          </button>
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${selectedClassId === c.id ? 'rgba(37, 99, 235, 0.5)' : '#e2e8f0'}`,
                background: selectedClassId === c.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: selectedClassId === c.id ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
            >
              📚 {c.name}
            </button>
          ))}
        </div>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
          当前编辑：{scopeLabel}
        </p>
      </div>

      {/* 当前配置状态 */}
      {currentConfig?.configured && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '14px' }}>已配置</span>
          </div>
          <div style={{ color: '#334155', fontSize: '13px', lineHeight: 1.6 }}>
            提供商：{PROVIDER_LABELS[currentConfig.provider || ''] || currentConfig.provider} · 模型：{currentConfig.model_name} ·
            API Key：{currentConfig.has_api_key ? '已设置' : '未设置'}
          </div>
        </div>
      )}

      {/* 配置表单 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* 提供商选择 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>LLM 提供商</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {providers.map(p => (
              <button
                key={p.provider}
                onClick={() => handleProviderChange(p.provider)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${provider === p.provider ? 'rgba(37, 99, 235, 0.5)' : '#e2e8f0'}`,
                  background: provider === p.provider ? 'rgba(37, 99, 235, 0.1)' : '#f8fafc',
                  color: provider === p.provider ? '#2563eb' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                  {PROVIDER_LABELS[p.provider] || p.label}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 模型名称 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>模型名称</label>
          {selectedTpl && selectedTpl.models.length > 0 ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {selectedTpl.models.map(m => (
                <button
                  key={m}
                  onClick={() => { setModelName(m); setTestResult(null); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${modelName === m ? 'rgba(37, 99, 235, 0.5)' : '#e2e8f0'}`,
                    background: modelName === m ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                    color: modelName === m ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          ) : null}
          <input
            type="text"
            value={modelName}
            onChange={(e) => { setModelName(e.target.value); setTestResult(null); }}
            placeholder="输入模型名称，如 deepseek-chat"
            style={inputStyle}
          />
        </div>

        {/* API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            API Key
            {selectedTpl && !selectedTpl.needs_api_key && (
              <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>(此提供商不需要)</span>
            )}
            {currentConfig?.has_api_key && !apiKey && (
              <span style={{ color: '#f59e0b', fontSize: '12px', marginLeft: '8px' }}>
                已保存（留空则保留原 Key）
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
            placeholder={currentConfig?.has_api_key ? '••••••••（留空保留原 Key）' : '输入 API Key'}
            style={inputStyle}
          />
          {selectedTpl?.api_key_url && (
            <a
              href={selectedTpl.api_key_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563eb', fontSize: '12px', marginTop: '6px', display: 'inline-block' }}
            >
              → 点击此处获取 API Key
            </a>
          )}
        </div>

        {/* Base URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            API 地址 (Base URL)
            {provider === 'custom' && (
              <span style={{ color: '#f59e0b', fontSize: '12px', marginLeft: '8px' }}>(中转站必填)</span>
            )}
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => { setBaseUrl(e.target.value); setTestResult(null); }}
            placeholder="https://api.example.com/v1"
            style={inputStyle}
          />
        </div>

        {/* 温度 & 最大Tokens */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>温度 (Temperature)</label>
            <input
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="0.7"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>最大 Tokens</label>
            <input
              type="text"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              placeholder="2000"
              style={inputStyle}
            />
          </div>
        </div>

        {/* 连通性测试结果 */}
        {testResult && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: testResult.success ? '#10b981' : '#ef4444',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {testResult.success ? '✅ ' : '❌ '}{testResult.message}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleTest}
            disabled={testing || saving}
            style={{
              ...btnStyle,
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.5)',
              color: '#2563eb',
              opacity: (testing || saving) ? 0.6 : 1,
            }}
          >
            {testing ? '⏳ 测试中...' : '🔌 测试连通性'}
          </button>
          <button
            onClick={handleSave}
            disabled={testing || saving}
            style={{
              ...btnStyle,
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.5)',
              color: '#2563eb',
              opacity: (testing || saving) ? 0.6 : 1,
            }}
          >
            {saving ? '⏳ 保存中...' : '💾 保存配置'}
          </button>
          {currentConfig?.configured && (
            <button
              onClick={handleDelete}
              disabled={testing || saving}
              style={{
                ...btnStyle,
              }}
            >
              🗑️ 删除配置
            </button>
          )}
        </div>
      </div>

      {/* 说明区 */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          borderRadius: '10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>💡 使用说明</div>
        <div>• <b>全局配置</b>：未单独配置的班级会使用此默认配置</div>
        <div>• <b>班级专属配置</b>：为特定班级设置不同模型（如快班用更强模型）</div>
        <div>• <b>学生端</b>：自动使用班级所属教师的配置，无需学生操作</div>
        <div>• <b>未配置</b>：智能体将使用规则引擎（基于关键词 + 用户上下文生成回复）</div>
        <div>• <b>中转站</b>：选择"自定义中转站"填入兼容 OpenAI 格式的中转 API 地址</div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  color: '#334155',
  fontSize: '13px',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const btnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'all 0.2s',
};

export default LLMSettings;
