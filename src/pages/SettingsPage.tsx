import { useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { MODEL_OPTIONS } from '@/lib/claudeApi';
import { getProviderMeta, PROVIDERS, type ProviderId } from '@/lib/visionProviders';
import { useSettings } from '@/AppSettingsContext';

export default function SettingsPage() {
  const { settings, update, current, updateProvider } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const meta = getProviderMeta(settings.provider);
  const hasKey = current.apiKey.trim().length > 0;

  function selectProvider(id: ProviderId) {
    update({ provider: id });
  }

  return (
    <div>
      <h2 className="page-title">设置</h2>
      <p className="page-desc">选择识别服务商并配置 Key；拍照识别需要其中任一服务</p>

      <div className="card">
        <p className="card-title">识别服务商</p>
        {PROVIDERS.map((p) => (
          <label key={p.id} className={`radio-card ${settings.provider === p.id ? 'selected' : ''}`}>
            <input
              type="radio"
              name="provider"
              checked={settings.provider === p.id}
              onChange={() => selectProvider(p.id)}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{p.hint}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="card">
        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <KeyRound style={{ width: 14, height: 14 }} />
          {meta.label} API Key
        </label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showKey ? 'text' : 'password'}
            placeholder="粘贴你的 API Key"
            value={current.apiKey}
            onChange={(e) => updateProvider(settings.provider, { apiKey: e.target.value })}
            autoComplete="off"
            spellCheck={false}
            style={{ paddingRight: 44 }}
          />
          <button
            aria-label={showKey ? '隐藏' : '显示'}
            onClick={() => setShowKey((v) => !v)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'none',
              color: 'var(--gray-500)',
              cursor: 'pointer',
              display: 'flex',
              padding: 4,
            }}
          >
            {showKey ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
          </button>
        </div>
        {meta.keyUrl && (
          <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '8px 0 0' }}>
            获取地址：{' '}
            <a href={meta.keyUrl} target="_blank" rel="noreferrer">
              {meta.keyUrl.replace('https://', '')}
            </a>
          </p>
        )}
        {hasKey && (
          <button
            className="btn btn-danger-ghost"
            style={{ marginTop: 10 }}
            onClick={() => updateProvider(settings.provider, { apiKey: '' })}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
            清除该服务商的 Key
          </button>
        )}
      </div>

      <div className="card">
        <label className="field-label">模型</label>
        {settings.provider === 'claude' ? (
          MODEL_OPTIONS.map((m) => (
            <label
              key={m.id}
              className={`radio-card ${current.model === m.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="model"
                checked={current.model === m.id}
                onChange={() => updateProvider(settings.provider, { model: m.id })}
              />
              {m.label}
            </label>
          ))
        ) : (
          <input
            className="input"
            value={current.model}
            onChange={(e) => updateProvider(settings.provider, { model: e.target.value })}
            placeholder="模型名称"
            spellCheck={false}
          />
        )}

        <label className="field-label" style={{ marginTop: 12 }}>
          接口地址（baseURL）
        </label>
        <input
          className="input"
          value={current.baseURL}
          onChange={(e) => updateProvider(settings.provider, { baseURL: e.target.value })}
          placeholder={settings.provider === 'claude' ? 'https://api.anthropic.com' : meta.defaultBaseURL}
          spellCheck={false}
        />
        <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '8px 0 0' }}>
          已按所选服务商预填默认地址；如使用代理或中转可自行修改。
        </p>
      </div>

      <div className="alert alert-success">
        <ShieldCheck />
        <span>
          <strong>隐私说明：</strong>所有识别请求由你的浏览器直接发送给所选服务商，
          API Key 仅保存在本机 localStorage，不会上传到任何第三方服务器。
          没有 Key 时仍可使用「离线 OCR」备用识别（浏览器本地，完全免费）。
        </span>
      </div>
    </div>
  );
}
