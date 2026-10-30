// Bảng quản lý 9 vị trí ảnh (mở từ Sidebar)
import { useMemo } from 'react';
import { RotateCcw, Camera, HardDrive } from 'lucide-react';
import { IMAGE_SLOTS, ALL_STORABLE_SLOT_IDS } from '../lib/imageSlots.jsx';
import { estimateStorageKB } from '../lib/storage.js';
import { ImageSlot, useImages } from './ImageSlot.jsx';
import { Button, IconButton, Modal, cx } from './ui.jsx';

function StatusBadge({ custom }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        custom ? 'bg-cozy-matcha/25 text-cozy-text' : 'bg-cozy-butter text-cozy-text'
      )}
    >
      {custom ? 'Đã tùy chỉnh' : 'Mặc định'}
    </span>
  );
}

export default function ImageManager() {
  const { images, managerOpen, closeManager, openEditor, resetImage, resetAll } = useImages();

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
      title="🖼️ Kho ảnh · Quản lý 9 vị trí hình ảnh"
      width="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-cozy-muted">
            <HardDrive size={15} /> Đã tùy chỉnh {customCount}/{ALL_STORABLE_SLOT_IDS.length} ảnh · Bộ nhớ đang dùng ≈ {usedKB} KB / ~5.000 KB
          </span>
          <Button
            variant="soft"
            disabled={customCount === 0}
            onClick={() => {
              if (window.confirm('Khôi phục TẤT CẢ hình ảnh về SVG gốc?')) resetAll();
            }}
          >
            <RotateCcw size={16} /> Khôi phục tất cả
          </Button>
        </div>
      }
    >
      <p className="mb-5 text-sm text-cozy-muted">
        Rê chuột lên từng hình và bấm <b className="text-cozy-text">📷 Đổi ảnh</b> để tải ảnh từ máy hoặc dán URL. Ảnh được lưu ngay trong máy bạn.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {IMAGE_SLOTS.map((slot, index) => {
          if (slot.group) {
            const anyCustom = slot.group.some((g) => images?.[g.slotId]);
            return (
              <div key={slot.slotId} className="rounded-3xl border border-cozy-line bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-cozy-text">
                      <span className="mr-1 text-cozy-peach">{index + 1}.</span> {slot.label}
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
                      <span className="text-[10px] font-semibold text-cozy-muted">{g.label}</span>
                      {images?.[g.slotId] && (
                        <button
                          type="button"
                          onClick={() => resetImage(g.slotId)}
                          className="text-[10px] text-cozy-peach hover:underline"
                        >
                          Gốc
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] text-cozy-muted/70">mood_happy · mood_peaceful · mood_excited · mood_tired · mood_sad</p>
              </div>
            );
          }

          const custom = images?.[slot.slotId];
          return (
            <div key={slot.slotId} className="flex flex-col rounded-3xl border border-cozy-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-cozy-text">
                    <span className="mr-1 text-cozy-peach">{index + 1}.</span> {slot.label}
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
                <span className="font-mono text-[10px] text-cozy-muted/70">{slot.slotId}</span>
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

