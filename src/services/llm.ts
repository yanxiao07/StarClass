import { apiClient } from './client';

// ========== 类型定义 ==========

export interface ProviderTemplate {
  provider: string;
  label: string;
  default_model: string;
  default_base_url: string;
  needs_api_key: boolean;
  models: string[];
  description: string;
  api_key_url: string | null;
}

export interface LLMConfig {
  configured: boolean;
  id?: string;
  provider?: string | null;
  model_name?: string | null;
  base_url?: string | null;
  has_api_key?: boolean;
  temperature?: number;
  max_tokens?: number;
  class_id?: string | null;
  updated_at?: string | null;
  message?: string;
}

export interface LLMStatus {
  available: boolean;
  provider?: string | null;
  model?: string | null;
  source?: string; // database | env | rule_engine
}

export interface TestResult {
  success: boolean;
  message: string;
  provider?: string;
  model?: string;
}

// ========== API 调用 ==========

export const llmApi = {
  /** 获取可用提供商模板 */
  getProviders: () => apiClient.get<ProviderTemplate[]>('/api/llm/providers'),

  /** 获取当前 LLM 配置（class_id 可选） */
  getConfig: (classId?: string) =>
    apiClient.get<LLMConfig>(`/api/llm/config${classId ? `?class_id=${classId}` : ''}`),

  /** 保存 LLM 配置 */
  saveConfig: (data: {
    provider: string;
    model_name: string;
    api_key?: string;
    base_url?: string;
    temperature?: string;
    max_tokens?: string;
    class_id?: string | null;
  }) => apiClient.put<{ message: string; configured: boolean; provider: string; model_name: string; has_api_key: boolean }>('/api/llm/config', data),

  /** 测试连通性 */
  testConnection: (data: {
    provider: string;
    model_name: string;
    api_key?: string;
    base_url?: string;
  }) => apiClient.post<TestResult>('/api/llm/test', data),

  /** 删除配置（恢复规则引擎） */
  deleteConfig: (classId?: string) =>
    apiClient.delete<{ message: string }>(`/api/llm/config${classId ? `?class_id=${classId}` : ''}`),

  /** 获取 LLM 状态（教师/学生通用） */
  getStatus: () => apiClient.get<LLMStatus>('/api/llm/status'),
};
