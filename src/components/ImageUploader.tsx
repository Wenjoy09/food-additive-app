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
  selected: SelectedImage | null;
  onSelect: (img: SelectedImage | null) => void;
  disabled?: boolean;
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

export default function ImageUploader({ selected, onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 允许重复选择同一文件
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    try {
      const { base64, mediaType } = await fileToBase64(file);
      // 释放旧的预览 URL
      if (selected) URL.revokeObjectURL(selected.previewUrl);
      onSelect({
        base64,
        mediaType,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '读取图片失败');
    }
  }

  if (selected) {
    return (
      <div className="upload-preview">
        <img src={selected.previewUrl} alt="已选图片" />
        <button
          className="remove-btn"
          aria-label="移除图片"
          onClick={() => {
            URL.revokeObjectURL(selected.previewUrl);
            onSelect(null);
          }}
        >
          <X />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="upload-area"
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <Camera />
        <div>点击上传食品包装照片</div>
        <div style={{ marginTop: 4, fontSize: 12 }}>
          请拍清楚「配料表」和「营养成分表」
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </>
  );
}
