// Bảng quản lý 9 vị trí hình ảnh hệ thống (mở từ Sidebar)
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Camera, HardDrive, FolderOpen, Images } from 'lucide-react';
import { IMAGE_SLOTS, ALL_STORABLE_SLOT_IDS } from '../lib/imageSlots.jsx';
import { estimateStorageKB } from '../lib/storage.js';
import { ImageSlot, useImages } from './ImageSlot.jsx';
import { Button, IconButton, Modal, cx } from './ui.jsx';
import { useToast } from './Toast.jsx';

function StatusBadge({ custom }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        custom ? 'bg-cozy-matcha/30 text-cozy-text' : 'bg-cozy-butter text-cozy-text'
      )}
    >
      {custom ? 'Đã tùy chỉnh' : 'Mặc định'}
    </span>
  );
}

export default function ImageManager() {
  const { images, managerOpen, closeManager, openEditor, resetImage, resetAll } = useImages();
  const { confirm, toast } = useToast();
  const [diskInfo, setDiskInfo] = useState(null);
  const isElectron = Boolean(typeof window !== 'undefined' && window.cozyEnv?.isElectron);

  useEffect(() => {
    if (!managerOpen || !isElectron) return;
    window.cozyEnv?.getStorageInfo?.().then(setDiskInfo).catch(() => {});
  }, [managerOpen, images, isElectron]);

  const customCount = useMemo(
    () => ALL_STORABLE_SLOT_IDS.filter((id) => images?.[id]).length,
    [images]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const usedKB = useMemo(() => (managerOpen ? estimateStorageKB() : 0), [images, managerOpen]);

  return (
    <Modal
      open={managerOpen}
      onClose={closeManager}
      title={
        <span className="inline-flex items-center gap-2">
          <Images size={18} strokeWidth={1.75} className="text-cozy-accent" />
          <span>Kho ảnh · Quản lý 9 vị trí hình ảnh</span>
        </span>
      }
      width="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-cozy-muted">
            <span className="flex items-center gap-2">
              <HardDrive size={15} /> Đã tùy chỉnh {customCount}/{ALL_STORABLE_SLOT_IDS.length} ảnh ·{' '}
              {diskInfo
                ? `Ổ cứng đang lưu ${diskInfo.mediaCount} tệp media (${diskInfo.mediaSizeKB.toLocaleString('vi-VN')} KB)`
                : `Bộ nhớ ≈ ${usedKB} KB`}
            </span>
            {isElectron && (
              <button
                type="button"
                onClick={() => window.cozyEnv?.openDataFolder?.()}
                className="inline-flex items-center gap-1 text-xs font-bold text-cozy-accent hover:underline"
              >
                <FolderOpen size={13} /> Mở thư mục trên máy
              </button>
            )}
          </div>
          <Button
            variant="soft"
            disabled={customCount === 0}
            onClick={async () => {
              const ok = await confirm({
                title: 'Khôi phục tất cả hình ảnh?',
                message: 'Toàn bộ 9 vị trí ảnh hệ thống sẽ quay về bộ hình vẽ SVG gốc của CozySpace.',
                confirmLabel: 'Khôi phục gốc',
                danger: true,
              });
              if (ok) {
                resetAll();
                toast({ message: 'Đã khôi phục tất cả hình ảnh về SVG mặc định.' });
              }
            }}
          >
            <RotateCcw size={16} /> Khôi phục tất cả
          </Button>
        </div>
      }
    >
      <p className="mb-5 text-sm text-cozy-muted">
        Rê chuột lên từng hình và bấm <b className="text-cozy-text">Đổi ảnh</b> để tải ảnh từ máy tính hoặc dán URL. Ảnh tải lên được lưu thành tệp thật trên ổ cứng máy tính của bạn.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {IMAGE_SLOTS.map((slot, index) => {
          if (slot.group) {
            const anyCustom = slot.group.some((g) => images?.[g.slotId]);
            return (
              <div key={slot.slotId} className="rounded-3xl border border-cozy-line bg-cozy-card p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-cozy-text">
                      <span className="mr-1 text-cozy-accent">{index + 1}.</span> {slot.label}
                    </p>
                    <p className="text-xs text-cozy-muted">{slot.desc}</p>
                  </div>
                  <StatusBadge custom={anyCustom} />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {slot.group.map((g) => (
                    <div key={g.slotId} className="flex flex-col items-center gap-1">
                      <ImageSlot
                        slotId={g.slotId}
                        defaultSvg={<g.Svg />}
                        compact
                        fit="contain"
                        buttonPosition="center"
                        className="aspect-square w-full rounded-2xl bg-cozy-bg p-1"
                      />
                      <span className="text-[11px] font-semibold text-cozy-muted">{g.label}</span>
                      {images?.[g.slotId] && (
                        <button
                          type="button"
                          onClick={() => resetImage(g.slotId)}
                          className="text-[11px] font-bold text-cozy-accent hover:underline"
                        >
                          Gốc
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          const custom = images?.[slot.slotId];
          return (
            <div key={slot.slotId} className="flex flex-col rounded-3xl border border-cozy-line bg-cozy-card p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-cozy-text">
                    <span className="mr-1 text-cozy-accent">{index + 1}.</span> {slot.label}
                  </p>
                  <p className="text-xs text-cozy-muted">{slot.desc}</p>
                </div>
                <StatusBadge custom={custom} />
              </div>
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-cozy-bg p-2">
                <ImageSlot
                  slotId={slot.slotId}
                  defaultSvg={<slot.Svg />}
                  fit={['mascot_focus', 'mascot_break', 'expense_piggy', 'empty_state'].includes(slot.slotId) ? 'contain' : 'cover'}
                  className={cx(
                    'overflow-hidden rounded-xl',
                    slot.aspect,
                    slot.slotId === 'user_avatar' ? 'w-24 rounded-full' : slot.slotId === 'dashboard_banner' ? 'w-full' : 'w-full max-w-[200px]'
                  )}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[11px] text-cozy-muted/80">{slot.slotId}</span>
                <div className="flex gap-1">
                  <IconButton title="Đổi ảnh" onClick={() => openEditor(slot.slotId)}>
                    <Camera size={16} />
                  </IconButton>
                  <IconButton title="Khôi phục gốc" disabled={!custom} onClick={() => resetImage(slot.slotId)} className="disabled:opacity-30">
                    <RotateCcw size={16} />
                  </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
