// ============================================================
// HỆ THỐNG HÌNH ẢNH 2 LỚP - PROJECT_RULES.md mục I.3
//   Lớp 1: SVG mặc định (defaultSvg)
//   Lớp 2: Ảnh tùy chỉnh (Base64 / URL) lưu trong `cozy_custom_images`
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImageUp, Link2, RotateCcw, Upload, AlertCircle } from 'lucide-react';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { getSlotMeta } from '../lib/imageSlots.jsx';
import { fileToCompressedDataURL } from '../lib/utils.js';
import { Button, Input, Modal, cx } from './ui.jsx';

const ImageContext = createContext(null);

export function ImageProvider({ children }) {
  const [images, setImages] = useCozyStorage(STORAGE_KEYS.CUSTOM_IMAGES);
  const [editingSlot, setEditingSlot] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const setImage = useCallback(
    (slotId, value) => setImages((prev) => ({ ...prev, [slotId]: value })),
    [setImages]
  );

  const resetImage = useCallback(
    (slotId) =>
      setImages((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      }),
    [setImages]
  );

  const resetAll = useCallback(() => setImages({}), [setImages]);

  const value = useMemo(
    () => ({
      images,
      setImage,
      resetImage,
      resetAll,
      openEditor: setEditingSlot,
      managerOpen,
      openManager: () => setManagerOpen(true),
      closeManager: () => setManagerOpen(false),
    }),
    [images, setImage, resetImage, resetAll, managerOpen]
  );

  return (
    <ImageContext.Provider value={value}>
      {children}
      <ImageEditorDialog slotId={editingSlot} onClose={() => setEditingSlot(null)} />
    </ImageContext.Provider>
  );
}

export function useImages() {
  const ctx = useContext(ImageContext);
  if (!ctx) throw new Error('useImages phải được dùng bên trong <ImageProvider>');
  return ctx;
}

/**
 * <ImageSlot slotId="..." defaultSvg={<Svg />} />
 * - editable: hiện nút "📷 Đổi ảnh" khi rê chuột
 * - compact: nút dạng icon nhỏ (cho avatar, sticker)
 * - fit: 'cover' | 'contain'
 */
export function ImageSlot({
  slotId,
  defaultSvg,
  className,
  editable = true,
  compact = false,
  fit = 'cover',
  alt,
  buttonPosition = 'top-right',
  rounded,
}) {
  const { images, openEditor } = useImages();
  const custom = images?.[slotId];
  const [brokenSrc, setBrokenSrc] = useState(null);
  const isBroken = custom && brokenSrc === custom;
  const meta = getSlotMeta(slotId);
  const fallback = defaultSvg ?? (meta.Svg ? <meta.Svg /> : null);

  const posClass =
    buttonPosition === 'bottom-right'
      ? 'bottom-2 right-2'
      : buttonPosition === 'center'
        ? 'inset-0 m-auto h-fit w-fit'
        : 'top-2 right-2';

  return (
    <div className={cx('group/slot relative overflow-hidden', rounded, className)} data-slot={slotId}>
      {custom && !isBroken ? (
        <img
          src={custom}
          alt={alt || meta.label}
          draggable={false}
          onError={() => setBrokenSrc(custom)}
          className={cx('block h-full w-full select-none', fit === 'contain' ? 'object-contain' : 'object-cover')}
        />
      ) : (
        <div className="h-full w-full [&>svg]:block">{fallback}</div>
      )}

      {isBroken && (
        <span
          title="Không tải được ảnh tùy chỉnh, đang hiển thị ảnh gốc"
          className="absolute left-2 top-2 rounded-full bg-white/90 p-1 text-cozy-peach shadow-sm"
        >
          <AlertCircle size={14} />
        </span>
      )}

      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openEditor(slotId);
          }}
          title={`Đổi ảnh: ${meta.label}`}
          className={cx(
            'absolute z-10 flex items-center gap-1 rounded-full border border-cozy-line bg-white/90 font-semibold text-cozy-text shadow-sm backdrop-blur',
            'opacity-0 transition-opacity duration-200 group-hover/slot:opacity-100 focus-visible:opacity-100 hover:bg-white',
            compact ? 'p-1.5 text-[11px]' : 'px-3 py-1.5 text-xs',
            posClass
          )}
        >
          {compact ? <Camera size={13} /> : <>📷 Đổi ảnh</>}
        </button>
      )}
    </div>
  );
}

/** Hộp thoại đổi ảnh: tải từ máy (Base64), dán URL, dán từ clipboard, khôi phục gốc */
export function ImageEditorDialog({ slotId, onClose }) {
  const { images, setImage, resetImage } = useImages();
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [urlPreviewOk, setUrlPreviewOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const open = Boolean(slotId);
  const meta = slotId ? getSlotMeta(slotId) : null;
  const custom = slotId ? images?.[slotId] : null;

  useEffect(() => {
    if (open) {
      setTab('upload');
      setUrl(custom && !custom.startsWith('data:') ? custom : '');
      setUrlPreviewOk(null);
      setError('');
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  const handleFile = useCallback(
    async (file) => {
      if (!file || !slotId) return;
      setBusy(true);
      setError('');
      try {
        const dataUrl = await fileToCompressedDataURL(file, meta.maxSize);
        setImage(slotId, dataUrl);
        onClose();
      } catch (err) {
        setError(err.message || 'Không xử lý được ảnh.');
      } finally {
        setBusy(false);
      }
    },
    [slotId, meta, setImage, onClose]
  );

  // Dán ảnh trực tiếp bằng Ctrl+V
  useEffect(() => {
    if (!open) return undefined;
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (item) {
        e.preventDefault();
        handleFile(item.getAsFile());
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, handleFile]);

  const applyUrl = () => {
    const v = url.trim();
    if (!/^(https?:\/\/|data:image\/)/i.test(v)) {
      setError('URL ảnh cần bắt đầu bằng http:// hoặc https://');
      return;
    }
    setImage(slotId, v);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`📷 Đổi ảnh · ${meta.label}`} width="max-w-xl">
      <div className="space-y-5">
        {/* Xem trước hiện tại */}
        <div className="flex items-center gap-4 rounded-2xl border border-cozy-line bg-white p-3">
          <div className={cx('w-28 shrink-0 overflow-hidden rounded-xl border border-cozy-line bg-cozy-bg', meta.aspect)}>
            <ImageSlot slotId={slotId} editable={false} className="h-full w-full" fit={meta.parent ? 'contain' : 'cover'} />
          </div>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-cozy-text">{meta.desc}</p>
            <p className="mt-1 text-cozy-muted">
              Đang dùng:{' '}
              <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', custom ? 'bg-cozy-matcha/25 text-cozy-text' : 'bg-cozy-butter text-cozy-text')}>
                {custom ? (custom.startsWith('data:') ? 'Ảnh tải lên' : 'Ảnh từ URL') : 'Hình gốc (SVG)'}
              </span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-cozy-muted/80">slotId: {slotId}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl bg-cozy-blush p-1">
          {[
            { id: 'upload', icon: Upload, label: 'Tải từ máy tính' },
            { id: 'url', icon: Link2, label: 'Dán URL ảnh' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setError('');
              }}
              className={cx(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition',
                tab === t.id ? 'bg-white text-cozy-text shadow-sm' : 'text-cozy-muted hover:text-cozy-text'
              )}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition',
              dragOver ? 'border-cozy-peach bg-cozy-blush' : 'border-cozy-line bg-white hover:border-cozy-peach/60'
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cozy-peach/20 text-cozy-peach">
              <ImageUp size={24} />
            </div>
            <p className="font-semibold text-cozy-text">{busy ? 'Đang xử lý ảnh...' : 'Bấm để chọn ảnh hoặc kéo thả vào đây'}</p>
            <p className="text-xs text-cozy-muted">PNG, JPG, WEBP, GIF, SVG · Có thể nhấn Ctrl+V để dán ảnh</p>
            <p className="text-[11px] text-cozy-muted/80">Ảnh sẽ được tự thu nhỏ (tối đa {meta.maxSize}px) để tiết kiệm bộ nhớ</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="https://... (đường dẫn trực tiếp tới ảnh)"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlPreviewOk(null);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
            />
            {url.trim() && (
              <div className={cx('mx-auto w-48 overflow-hidden rounded-2xl border border-cozy-line bg-white', meta.aspect)}>
                <img
                  src={url.trim()}
                  alt="Xem trước"
                  className="h-full w-full object-cover"
                  onLoad={() => setUrlPreviewOk(true)}
                  onError={() => setUrlPreviewOk(false)}
                />
              </div>
            )}
            {urlPreviewOk === false && (
              <p className="text-center text-xs text-cozy-muted">Chưa xem trước được ảnh này — vẫn có thể thử áp dụng.</p>
            )}
            <Button className="w-full" onClick={applyUrl} disabled={!url.trim()}>
              <Link2 size={16} /> Áp dụng ảnh từ URL
            </Button>
          </div>
        )}

        {error && (
          <p className="rounded-2xl bg-cozy-blush px-4 py-2 text-sm text-cozy-text">
            <AlertCircle size={14} className="mr-1 inline text-cozy-peach" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-cozy-line pt-4">
          <Button
            variant="soft"
            disabled={!custom}
            onClick={() => {
              resetImage(slotId);
              onClose();
            }}
          >
            <RotateCcw size={16} /> Khôi phục gốc
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}

