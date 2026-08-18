import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import type { ImageMediaType } from '@/lib/types';

export interface SelectedImage {
  /** base64 编码（不含 data: 前缀） */
  base64: string;
  mediaType: ImageMediaType;
  /** 用于预览的本地 URL */
  previewUrl: string;
  fileName: string;
}

interface Props {
  selected: SelectedImage[];
  onSelect: (imgs: SelectedImage[]) => void;
  /** 最多张数，默认 3（配料表与营养成分表可能不在同一面） */
  max?: number;
}

/** 把浏览器 File 读成 base64 + mediaType */
export function fileToBase64(file: File): Promise<{ base64: string; mediaType: ImageMediaType }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('读取文件失败'));
        return;
      }
      const match = /^data:([^;]+);base64,(.*)$/.exec(result);
      if (!match) {
        reject(new Error('读取文件失败'));
        return;
      }
      const mime = match[1];
      const mediaType: ImageMediaType =
        mime === 'image/png'
          ? 'image/png'
          : mime === 'image/webp'
            ? 'image/webp'
            : mime === 'image/gif'
              ? 'image/gif'
              : 'image/jpeg';
      resolve({ base64: match[2], mediaType });
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

export default function ImageUploader({ selected, onSelect, max = 3 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const room = max - selected.length;
    const added: SelectedImage[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const { base64, mediaType } = await fileToBase64(file);
        added.push({
          base64,
          mediaType,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name,
        });
      } catch {
        // 单张读取失败跳过，不阻断其余图片
      }
    }
    if (added.length) onSelect([...selected, ...added]);
  }

  function removeAt(idx: number) {
    URL.revokeObjectURL(selected[idx].previewUrl);
    onSelect(selected.filter((_, i) => i !== idx));
  }

  return (
    <div className="upload-grid">
      {selected.map((img, i) => (
        <div className="upload-tile" key={img.previewUrl}>
          <img src={img.previewUrl} alt={`图片 ${i + 1}`} />
          <button className="remove-btn" aria-label="移除" onClick={() => removeAt(i)}>
            <X />
          </button>
        </div>
      ))}
      {selected.length < max && (
        <div
          className="upload-add"
          style={selected.length === 0 ? { width: '100%', minHeight: 170 } : undefined}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <Camera />
          <div>添加照片（{selected.length}/{max}）</div>
          <div className="upload-hint">
            配料表和营养成分表不在同一面时，可分别拍照一起上传
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
    </div>
  );
}
