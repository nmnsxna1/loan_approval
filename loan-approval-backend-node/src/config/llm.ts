import fs from 'fs';
import path from 'path';

const OFFLINE_TIMEOUT_MS = 3_600_000;
const ONLINE_TIMEOUT_MS = 60_000;

const LOCAL_PATTERNS = ['127.0.0.1', 'localhost', '0.0.0.0', '::1'];

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'openai-compatible' | 'ollama';

export interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface LlmConfig extends ProviderConfig {
  provider: ProviderName;
}

function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return LOCAL_PATTERNS.some(p => host === p || host.endsWith('.' + p));
  } catch {
    return false;
  }
}

function resolveTimeout(timeoutMs: number, baseUrl: string): number {
  if (timeoutMs > 0) return timeoutMs;
  return isLocalUrl(baseUrl) ? OFFLINE_TIMEOUT_MS : ONLINE_TIMEOUT_MS;
}

function resolveApiKey(provider: string, configuredKey: string): string {
  const envVar = `LLM_${provider.toUpperCase().replace('-', '_')}_API_KEY`;
  const genericEnvVar = 'LLM_API_KEY';
  return process.env[envVar] || process.env[genericEnvVar] || configuredKey;
}

function findConfigFile(): string {
  const searchPaths = [
    path.resolve(__dirname, '..', '..', '..', 'llm.json'),
    path.resolve(__dirname, '..', '..', 'llm.json'),
    path.resolve(process.cwd(), 'llm.json'),
  ];
  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'llm.json not found. Create it at the project root with your LLM configuration. ' +
    'See llm.json.example or check the docs.'
  );
}

export function getLlmConfig(): LlmConfig {
  const configPath = findConfigFile();
  const raw = fs.readFileSync(configPath, 'utf-8');
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in llm.json: ${configPath}`);
  }

  const active = parsed.active || 'openai-compatible';
  const providerConfig: ProviderConfig | undefined = parsed.providers?.[active];

  if (!providerConfig) {
    throw new Error(
      `Provider "${active}" not found in llm.json. Available: ${
        Object.keys(parsed.providers || {}).join(', ') || 'none'
      }`
    );
  }

  const apiKey = resolveApiKey(active, providerConfig.apiKey);
  const timeoutMs = resolveTimeout(providerConfig.timeoutMs, providerConfig.baseUrl);

  return {
    provider: active as ProviderName,
    baseUrl: providerConfig.baseUrl.replace(/\/+$/, ''),
    model: providerConfig.model || '',
    apiKey,
    temperature: providerConfig.temperature ?? 0.2,
    maxTokens: providerConfig.maxTokens ?? -1,
    timeoutMs,
  };
}
