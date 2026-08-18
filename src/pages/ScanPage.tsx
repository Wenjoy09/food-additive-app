import { useState } from 'react';
import { AlertTriangle, Loader2, ScanText, Sparkles } from 'lucide-react';
import { ApiAuthError } from '@/lib/claudeApi';
import { analyzeIngredientsWithProvider } from '@/lib/visionProviders';
import { recognizeManyTexts, textToIngredientResult } from '@/lib/offlineOcr';
import { preprocessForOcr } from '@/lib/imagePreprocess';
import { matchAdditives } from '@/lib/additives';
import { SAMPLE_INGREDIENT_RESULT } from '@/data/sampleResults';
import type { IngredientScanResult } from '@/lib/types';
import { useSettings } from '@/AppSettingsContext';
import ImageUploader, { type SelectedImage } from '@/components/ImageUploader';
import IngredientResult from '@/components/IngredientResult';

interface Props {
  onOpenDetail: (id: string) => void;
}

type Phase = 'idle' | 'loading' | 'done' | 'error';

export default function ScanPage({ onOpenDetail }: Props) {
  const { current, toApiSettings } = useSettings();
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [authProblem, setAuthProblem] = useState(false);
  const [result, setResult] = useState<IngredientScanResult | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [isOcr, setIsOcr] = useState(false);

  const hasKey = current.apiKey.trim().length > 0;

  async function analyze() {
    if (!images.length || !hasKey) return;
    setPhase('loading');
    setLoadingText('AI 正在识别配料表与营养成分表…通常需要 10-30 秒');
    setError('');
    setAuthProblem(false);
    setIsSample(false);
    setIsOcr(false);
    try {
      const res = await analyzeIngredientsWithProvider(
        toApiSettings(),
        images.map((i) => ({ base64: i.base64, mediaType: i.mediaType }))
      );
      setResult(res);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败，请重试');
      if (e instanceof ApiAuthError) setAuthProblem(true);
      setPhase('error');
    }
  }

  /** 离线 OCR 备用：浏览器本地识别，无需 Key；支持多张合并 */
  async function analyzeOffline() {
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
      const joined = texts.join('\n\n').trim();
      if (!joined) {
        setError('离线 OCR 未能识别出文字，请换更清晰、光线充足的照片');
        setPhase('error');
        return;
      }
      setResult(textToIngredientResult(joined));
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '离线识别失败');
      setPhase('error');
    }
  }

  function useSample() {
    setImages([]);
    setError('');
    setAuthProblem(false);
    setResult(SAMPLE_INGREDIENT_RESULT);
    setIsSample(true);
    setIsOcr(false);
    setPhase('done');
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setIsSample(false);
    setIsOcr(false);
    setError('');
    setImages([]);
  }

  if (phase === 'done' && result) {
    return (
      <div>
        {isOcr && (
          <div className="alert alert-info">
            <span>
              结果来自离线 OCR（浏览器本地识别），准确率有限；配置服务商 Key
              后可使用更准的大模型视觉识别。
            </span>
          </div>
        )}
        <IngredientResult
          result={result}
          matched={matchAdditives(result.additives)}
          isSample={isSample}
          onOpenDetail={onOpenDetail}
        />
        <button className="btn btn-ghost" onClick={reset}>
          再扫描一次
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">配料表扫描</h2>
      <p className="page-desc">
        上传食品包装照片（最多 3 张），自动识别配料表与营养成分表，评估添加剂与健康情况
      </p>

      {!hasKey && (
        <div className="alert alert-info">
          <AlertTriangle />
          <span>
            尚未配置识别服务商的 Key。你可以直接使用「离线 OCR
            识别」（免费、无需联网），或到「设置」页配置通义千问/智谱/Claude
            获得更准的识别。
          </span>
        </div>
      )}

      {phase === 'loading' ? (
        <div className="loading">
          <Loader2 />
          {loadingText}
        </div>
      ) : (
        <>
          <ImageUploader selected={images} onSelect={setImages} max={3} />

          {phase === 'error' && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              <AlertTriangle />
              <span>
                {error}
                {authProblem && (
                  <>
                    <br />
                    请检查「设置」页中的 API Key、模型与接口地址。
                  </>
                )}
              </span>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              disabled={!images.length || !hasKey}
              onClick={analyze}
            >
              <Sparkles style={{ width: 17, height: 17 }} />
              AI 视觉分析
            </button>
            <button
              className="btn btn-secondary"
              disabled={!images.length}
              onClick={analyzeOffline}
            >
              <ScanText style={{ width: 17, height: 17 }} />
              离线 OCR 识别（免费备用）
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
