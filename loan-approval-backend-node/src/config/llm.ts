export interface LlmConfig {
  provider: 'openai-compatible';
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export function getLlmConfig(): LlmConfig {
  return {
    provider: (process.env.LLM_PROVIDER || 'openai-compatible') as 'openai-compatible',
    baseUrl: process.env.LLM_BASE_URL || 'http://127.0.0.1:1234',
    model: process.env.LLM_MODEL || '',
    apiKey: process.env.LLM_API_KEY || 'not-needed',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '-1', 10),
  };
}
