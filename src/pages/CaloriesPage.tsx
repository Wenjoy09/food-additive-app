import { useState } from 'react';
import { AlertTriangle, Flame, Loader2, Pencil, ScanText, Sparkles } from 'lucide-react';
import { ApiAuthError } from '@/lib/claudeApi';
import { analyzeCaloriesWithProvider } from '@/lib/visionProviders';
import { recognizeManyTexts, textToCalorieResult } from '@/lib/offlineOcr';
import { preprocessForOcr } from '@/lib/imagePreprocess';
import { caloriesToRiceBowls, toKcal, totalCalories } from '@/lib/nutritionEvaluator';
import { SAMPLE_CALORIE_RESULT } from '@/data/sampleResults';
import type { CalorieScanResult } from '@/lib/types';
import { useSettings } from '@/AppSettingsContext';
import ImageUploader, { type SelectedImage } from '@/components/ImageUploader';

type Phase = 'idle' | 'loading' | 'ready' | 'error';

export default function CaloriesPage() {
  const { current, toApiSettings } = useSettings();
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [authProblem, setAuthProblem] = useState(false);

  const [scan, setScan] = useState<CalorieScanResult | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [isOcr, setIsOcr] = useState(false);
  /** 每 100g 千卡（识别或手动输入后的最终值） */
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null);
  /** 手动模式 */
  const [manualMode, setManualMode] = useState(false);
  /** 手动模式：每 100g 能量（千焦 kJ） */
  const [manualKj, setManualKj] = useState('');
  /** 手动模式：总克数 */
  const [manualGrams, setManualGrams] = useState('300');
  const [totalGrams, setTotalGrams] = useState('300');
  /** 识别结果能量修正 */
  const [energyEdit, setEnergyEdit] = useState(false);
  const [editKj, setEditKj] = useState('');
  const [editKcal, setEditKcal] = useState('');

  const hasKey = current.apiKey.trim().length > 0;

  async function recognize() {
    if (!images.length || !hasKey) return;
    setPhase('loading');
    setLoadingText('AI 正在识别营养成分表中的能量行…通常需要 10-30 秒');
    setError('');
    setAuthProblem(false);
    setIsSample(false);
    setIsOcr(false);
    try {
      const res = await analyzeCaloriesWithProvider(
        toApiSettings(),
        images.map((i) => ({ base64: i.base64, mediaType: i.mediaType }))
      );
      applyScanResult(res, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败，请重试');
      if (e instanceof ApiAuthError) setAuthProblem(true);
      setPhase('error');
    }
  }

  /** 离线 OCR 备用：浏览器本地识别能量行；多张时取第一张识别出能量的 */
  async function recognizeOffline() {
    if (!images.length) return;
    setPhase('loading');
    setLoadingText('离线 OCR 预处理图片…');
    setError('');
    setAuthProblem(false);
    setIsSample(false);
    setIsOcr(true);
    try {
      const canvases = [];
      for (const img of images) {
        canvases.push(await preprocessForOcr(img.base64, img.mediaType));
      }
      const total = canvases.length;
      const texts = await recognizeManyTexts(canvases, (i, status, progress) => {
        if (status.includes('recognizing')) {
          setLoadingText(
            `离线 OCR 识别第 ${i + 1}/${total} 张… ${Math.round(progress * 100)}%`
          );
        } else if (status.includes('loading language')) {
          setLoadingText('正在加载离线识别语言包…');
        }
      });
      const found = texts
        .map((t) => ({ t, r: textToCalorieResult(t) }))
        .find(({ r }) => r.energyKj != null || r.energyKcal != null);
      if (!found || !found.t.trim()) {
        setError('离线 OCR 未能识别出能量数值，请换更清晰的照片，或手动输入千焦数');
        setPhase('error');
        return;
      }
      applyScanResult(found.r, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '离线识别失败');
      setPhase('error');
    }
  }

  function useSample() {
    setImages([]);
    setError('');
    setManualMode(false);
    setIsOcr(false);
    applyScanResult(SAMPLE_CALORIE_RESULT, true);
  }

  function applyScanResult(res: CalorieScanResult, sample: boolean) {
    setScan(res);
    setIsSample(sample);
    const kcalPerRef = toKcal({ ...emptyNutrition(), energyKj: res.energyKj, energyKcal: res.energyKcal });

    if (kcalPerRef == null) {
      setError('未能从图片中识别出能量数值，请换一张更清晰的照片，或使用手动输入');
      setPhase('error');
      return;
    }

    // 换算到每 100g
    let per100 = kcalPerRef;
    if (res.servingSizeG != null && res.servingSizeG > 0 && !isPer100(res.basis)) {
      per100 = (kcalPerRef / res.servingSizeG) * 100;
    }
    setKcalPer100g(per100);
    // 识别到商品总净含量（如 "210g/份"、"净含量：500g"）时自动填入，替代默认 300g
    if (res.totalWeightG != null && res.totalWeightG > 0) {
      setTotalGrams(String(res.totalWeightG));
    }
    setPhase('ready');
  }

  function useManual() {
    setManualMode(true);
    setScan(null);
    setIsSample(false);
    setImages([]);
    setPhase('idle');
    setKcalPer100g(null);
    setError('');
  }

  function submitManual() {
    const kj = parseFloat(manualKj);
    const g = parseFloat(manualGrams);
    if (!Number.isFinite(kj) || kj <= 0) {
      setError('请输入有效的每 100g 能量（千焦 kJ）');
      setPhase('error');
      return;
    }
    if (!Number.isFinite(g) || g <= 0) {
      setError('请输入有效的总克数');
      setPhase('error');
      return;
    }
    setError('');
    setKcalPer100g(kj / 4.184);
    setTotalGrams(String(g));
    setPhase('ready');
  }

  function reset() {
    setPhase('idle');
    setScan(null);
    setIsSample(false);
    setIsOcr(false);
    setKcalPer100g(null);
    setImages([]);
    setError('');
    setManualMode(false);
  }

  const grams = parseFloat(totalGrams);
  const gramsValid = Number.isFinite(grams) && grams > 0;
  const totalKcal = kcalPer100g != null && gramsValid ? totalCalories(kcalPer100g, grams) : null;

  return (
    <div>
      <h2 className="page-title">热量计算</h2>
      <p className="page-desc">
        拍照识别或直接输入每 100g 千焦数，再输入总克数，即可算出总卡路里
      </p>

      {!manualMode && phase !== 'ready' && !hasKey && (
        <div className="alert alert-info">
          <AlertTriangle />
          <span>
            尚未配置识别服务商的 Key。你可以使用「离线 OCR
            识别」（免费、无需联网）或手动输入千焦数，也可到「设置」页配置通义千问/智谱/Claude。
          </span>
        </div>
      )}

      {phase === 'ready' && kcalPer100g != null ? (
        <div>
          {isSample && (
            <div className="alert alert-info">
              <span>这是示例演示数据。配置服务商 Key 后即可扫描真实图片。</span>
            </div>
          )}
          {isOcr && (
            <div className="alert alert-info">
              <span>结果来自离线 OCR，数字识别可能有误差，请核对后再使用。</span>
            </div>
          )}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="card-title" style={{ margin: 0 }}>{scan?.productName ?? '手动输入的食品'}</p>
              {!manualMode && !energyEdit && (
                <button
                  className="edit-btn"
                  onClick={() => {
                    setEditKcal(String(Math.round(kcalPer100g!)));
                    setEditKj(String(Math.round(kcalPer100g! * 4.184)));
                    setEnergyEdit(true);
                  }}
                >
                  <Pencil style={{ width: 13, height: 13 }} /> 修正
                </button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '4px 0 4px' }}>
              {manualMode
                ? `每 100g = ${Math.round(kcalPer100g * 4.184)} 千焦 ≈ ${Math.round(kcalPer100g)} 千卡`
                : `识别结果：每 100g ≈ ${Math.round(kcalPer100g)} 千卡${
                    scan?.basis && !isPer100(scan.basis) && scan.servingSizeG
                      ? `（原始标注 ${scan.basis}${scan.servingSizeG}g，已换算）`
                      : ''
                  }`}
            </p>

            {energyEdit && (
              <div className="edit-grid" style={{ marginTop: 8 }}>
                <label className="edit-field">
                  <span>每 100g 能量 (kJ)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    value={editKj}
                    onChange={(e) => setEditKj(e.target.value)}
                  />
                </label>
                <label className="edit-field">
                  <span>每 100g 能量 (千卡)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    value={editKcal}
                    onChange={(e) => setEditKcal(e.target.value)}
                  />
                </label>
              </div>
            )}
            {energyEdit && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const kcal = parseFloat(editKcal);
                    const kj = parseFloat(editKj);
                    if (Number.isFinite(kcal) && kcal > 0) setKcalPer100g(kcal);
                    else if (Number.isFinite(kj) && kj > 0) setKcalPer100g(kj / 4.184);
                    setEnergyEdit(false);
                  }}
                >
                  保存并重算
                </button>
                <button className="btn btn-ghost" onClick={() => setEnergyEdit(false)}>
                  取消
                </button>
              </div>
            )}

            <label className="field-label" style={{ marginTop: 12 }}>
              这份食品一共多少克？
            </label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={1}
              value={totalGrams}
              onChange={(e) => setTotalGrams(e.target.value)}
              placeholder="如 300"
            />
            {!manualMode && scan?.totalWeightG != null && (
              <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '6px 0 0' }}>
                已按识别到的总净含量 {scan.totalWeightG}g 自动填入，可手动修改
              </p>
            )}

            {totalKcal != null && (
              <div className="big-number">
                <div>
                  <span className="value">{Math.round(totalKcal)}</span>
                  <span className="unit">千卡</span>
                </div>
                <div className="caption">
                  ≈ {caloriesToRiceBowls(totalKcal).toFixed(1)} 碗米饭（每碗约 200 千卡）
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-ghost" onClick={reset}>
            重新查询
          </button>
        </div>
      ) : phase === 'loading' ? (
        <div className="loading">
          <Loader2 />
          {loadingText}
        </div>
      ) : manualMode ? (
        <div>
          <div className="card">
            <label className="field-label">每 100g 能量（千焦 / kJ）</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={1}
              value={manualKj}
              onChange={(e) => setManualKj(e.target.value)}
              placeholder="如 1980（照抄营养成分表上的能量值）"
            />
            <label className="field-label" style={{ marginTop: 12 }}>
              这份食品一共多少克？
            </label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={1}
              value={manualGrams}
              onChange={(e) => setManualGrams(e.target.value)}
              placeholder="如 300"
            />
            <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '8px 0 0' }}>
              千焦会自动换算成千卡（1 千卡 ≈ 4.184 千焦）
            </p>
          </div>
          {phase === 'error' && error && (
            <div className="alert alert-error">
              <AlertTriangle />
              <span>{error}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={submitManual}>
              <Flame style={{ width: 17, height: 17 }} />
              开始计算
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              返回拍照识别
            </button>
          </div>
        </div>
      ) : (
        <>
          <ImageUploader selected={images} onSelect={setImages} max={3} />

          {phase === 'error' && error && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              <AlertTriangle />
              <span>
                {error}
                {authProblem && (
                  <>
                    <br />
                    请检查「设置」页中的 API Key 与模型选择。
                  </>
                )}
              </span>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" disabled={!images.length || !hasKey} onClick={recognize}>
              <Sparkles style={{ width: 17, height: 17 }} />
              AI 识别热量
            </button>
            <button className="btn btn-secondary" disabled={!images.length} onClick={recognizeOffline}>
              <ScanText style={{ width: 17, height: 17 }} />
              离线 OCR 识别（免费备用）
            </button>
            <button className="btn btn-secondary" onClick={useManual}>
              <Pencil style={{ width: 16, height: 16 }} />
              手动输入千焦 + 克数计算
            </button>
            <button className="btn btn-ghost" onClick={useSample}>
              使用示例数据演示
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function isPer100(basis: string | null): boolean {
  if (!basis) return true;
  return basis.includes('100g') || basis.includes('100ml') || basis.includes('100mL');
}

function emptyNutrition() {
  return {
    proteinG: null,
    fatG: null,
    carbohydrateG: null,
    sodiumMg: null,
  };
}
