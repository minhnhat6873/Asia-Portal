'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface AvatarCropDialogProps {
  source: string;
  fileName: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}

export default function AvatarCropDialog({ source, fileName, onCancel, onApply }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onCropComplete = useCallback((_percentage: Area, pixels: Area) => setArea(pixels), []);

  const applyCrop = async () => {
    if (!area || saving) return;
    setSaving(true);
    setError('');
    try {
      const image = new window.Image();
      if (!source.startsWith('blob:') && !source.startsWith('data:')) image.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Không thể mở ảnh để cắt. Vui lòng chọn lại ảnh từ máy.'));
        image.src = source;
      });
      const scale = Math.min(1, 1600 / area.width, 1200 / area.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(area.width * scale));
      canvas.height = Math.max(1, Math.round(area.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Trình duyệt không hỗ trợ cắt ảnh.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Không thể tạo ảnh sau khi cắt.');
      if (blob.size > 5 * 1024 * 1024) throw new Error('Ảnh sau khi cắt vượt quá 5 MB. Vui lòng chọn ảnh khác.');
      onApply(new File([blob], `${fileName.replace(/\.[^.]+$/, '') || 'avatar'}-crop.jpg`, { type: 'image/jpeg' }));
    } catch (err) {
      setError(err instanceof DOMException && err.name === 'SecurityError' ? 'Không thể chỉnh sửa ảnh hiện tại. Vui lòng chọn lại ảnh từ máy.' : err instanceof Error ? err.message : 'Không thể cắt ảnh. Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <h3 id="avatar-crop-title" className="text-lg font-bold text-slate-900">Điều chỉnh ảnh đại diện</h3>
        <p className="mt-1 text-sm text-slate-600">Kéo ảnh để chọn vị trí và dùng thanh bên dưới để phóng to hoặc thu nhỏ. Phần trong lưới sẽ được giữ lại.</p>
        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-slate-900">
          <Cropper image={source} crop={crop} zoom={zoom} aspect={4 / 3} minZoom={1} maxZoom={3} showGrid onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} mediaProps={{ onError: () => setError('Không thể mở ảnh. Vui lòng chọn lại ảnh từ máy.') }} />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
          <span>Thu nhỏ</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Độ phóng to ảnh" className="min-w-0 flex-1 accent-emerald-600" />
          <span>Phóng to</span>
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
          <button type="button" onClick={() => void applyCrop()} disabled={!area || saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Đang xử lý...' : 'Áp dụng'}</button>
        </div>
      </div>
    </div>
  );
}
