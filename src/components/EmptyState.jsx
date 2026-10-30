// Hình minh họa khi danh sách trống - dùng slot `empty_state`
import { ImageSlot } from './ImageSlot.jsx';
import { EmptyStateSvg } from '../assets/defaultSvgs.jsx';
import { cx } from './ui.jsx';

export default function EmptyState({ title = 'Chưa có gì ở đây', hint, className, size = 'w-40', children }) {
  return (
    <div className={cx('flex flex-col items-center justify-center py-8 text-center', className)}>
      <ImageSlot
        slotId="empty_state"
        defaultSvg={<EmptyStateSvg />}
        fit="contain"
        className={cx('aspect-[22/17] rounded-2xl', size)}
      />
      <p className="mt-3 font-bold text-cozy-text">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-cozy-muted">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

