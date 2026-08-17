import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getProviderMeta, type ProviderId } from '@/lib/visionProviders';

/**
 * 应用设置上下文：识别服务商、API Key、模型、接口地址。
 * 每个服务商的配置独立保存，切换不丢失。保存在 localStorage。
 */
export interface ProviderSettings {
  apiKey: string;
  model: string;
  baseURL: string;
}

interface AppSettings {
  provider: ProviderId;
  providers: Record<ProviderId, ProviderSettings>;
}

const STORAGE_KEY = 'food-safety-scan.settings.v2';

function defaultProviderSettings(id: ProviderId): ProviderSettings {
  const meta = getProviderMeta(id);
  return { apiKey: '', model: meta.defaultModel, baseURL: meta.defaultBaseURL };
}

const DEFAULTS: AppSettings = {
  provider: 'qwen',
  providers: {
    claude: defaultProviderSettings('claude'),
    qwen: defaultProviderSettings('qwen'),
    glm: defaultProviderSettings('glm'),
    custom: defaultProviderSettings('custom'),
  },
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      provider: parsed.provider ?? DEFAULTS.provider,
      providers: { ...DEFAULTS.providers, ...(parsed.providers ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  /** 当前服务商的配置 */
  current: ProviderSettings;
  update: (patch: Partial<AppSettings>) => void;
  updateProvider: (id: ProviderId, patch: Partial<ProviderSettings>) => void;
  /** 供识别层使用：apiKey/model/baseURL + provider */
  toApiSettings: () => { apiKey: string; model: string; baseURL?: string; provider: ProviderId };
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // 忽略持久化失败（如隐私模式）
    }
  }, [settings]);

  const current = settings.providers[settings.provider];

  const update = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const updateProvider = (id: ProviderId, patch: Partial<ProviderSettings>) => {
    setSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [id]: { ...prev.providers[id], ...patch },
      },
    }));
  };

  const toApiSettings = () => ({
    apiKey: current.apiKey,
    model: current.model,
    baseURL: current.baseURL || undefined,
    provider: settings.provider,
  });

  return (
    <SettingsContext.Provider value={{ settings, current, update, updateProvider, toApiSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用');
  return ctx;
}
