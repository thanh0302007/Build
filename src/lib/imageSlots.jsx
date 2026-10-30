// ============================================================
// DANH SÁCH 9 VỊ TRÍ HÌNH ẢNH (slotId) - PROJECT_RULES.md mục III
// ============================================================
import {
  AppBgSvg,
  DashboardBannerSvg,
  UserAvatarSvg,
  MascotFocusSvg,
  MascotBreakSvg,
  MoodHappySvg,
  MoodPeacefulSvg,
  MoodExcitedSvg,
  MoodTiredSvg,
  MoodSadSvg,
  SubjectCoverSvg,
  ExpensePiggySvg,
  EmptyStateSvg,
} from '../assets/defaultSvgs.jsx';

/** 5 sticker con thuộc vị trí số 6 `mood_stickers` */
export const MOOD_SUB_SLOTS = [
  { slotId: 'mood_happy', mood: 'happy', label: 'Vui vẻ', Svg: MoodHappySvg },
  { slotId: 'mood_peaceful', mood: 'peaceful', label: 'Bình yên', Svg: MoodPeacefulSvg },
  { slotId: 'mood_excited', mood: 'excited', label: 'Hào hứng', Svg: MoodExcitedSvg },
  { slotId: 'mood_tired', mood: 'tired', label: 'Mệt mỏi', Svg: MoodTiredSvg },
  { slotId: 'mood_sad', mood: 'sad', label: 'Buồn', Svg: MoodSadSvg },
];

/**
 * 9 vị trí chính. `maxSize` = cạnh dài tối đa (px) khi nén ảnh tải lên,
 * giúp tiết kiệm dung lượng localStorage.
 */
export const IMAGE_SLOTS = [
  { slotId: 'app_bg', label: 'Hình nền ứng dụng', desc: 'Nền kem chấm bi phủ toàn bộ CozySpace', Svg: AppBgSvg, aspect: 'aspect-video', maxSize: 1920 },
  { slotId: 'dashboard_banner', label: 'Banner trang chủ', desc: 'Góc bàn học ấm cúng bên cửa sổ', Svg: DashboardBannerSvg, aspect: 'aspect-[4/1]', maxSize: 1920 },
  { slotId: 'user_avatar', label: 'Ảnh đại diện', desc: 'Hiển thị ở thanh Sidebar', Svg: UserAvatarSvg, aspect: 'aspect-square', maxSize: 400 },
  { slotId: 'mascot_focus', label: 'Mascot giờ học', desc: 'Mèo đeo tai nghe đọc sách (Pomodoro)', Svg: MascotFocusSvg, aspect: 'aspect-square', maxSize: 700 },
  { slotId: 'mascot_break', label: 'Mascot giờ nghỉ', desc: 'Mèo nằm ngủ gật khi giải lao', Svg: MascotBreakSvg, aspect: 'aspect-square', maxSize: 700 },
  { slotId: 'mood_stickers', label: 'Sticker cảm xúc', desc: 'Bộ 5 icon cảm xúc trong Nhật ký', group: MOOD_SUB_SLOTS },
  { slotId: 'subject_default_cover', label: 'Bìa sổ môn học', desc: 'Ảnh bìa mặc định cho sổ tay môn học', Svg: SubjectCoverSvg, aspect: 'aspect-[3/2]', maxSize: 1000 },
  { slotId: 'expense_piggy', label: 'Ống heo tiết kiệm', desc: 'Hình minh họa ở Sổ thu chi', Svg: ExpensePiggySvg, aspect: 'aspect-[10/9]', maxSize: 700 },
  { slotId: 'empty_state', label: 'Danh sách trống', desc: 'Khi chưa có việc cần làm / ghi chú', Svg: EmptyStateSvg, aspect: 'aspect-[22/17]', maxSize: 700 },
];

const META_MAP = (() => {
  const map = {};
  IMAGE_SLOTS.forEach((s) => {
    if (s.group) {
      s.group.forEach((g) => {
        map[g.slotId] = { ...g, desc: `Sticker cảm xúc "${g.label}"`, aspect: 'aspect-square', maxSize: 256, parent: s.slotId };
      });
    } else {
      map[s.slotId] = s;
    }
  });
  return map;
})();

export const getSlotMeta = (slotId) =>
  META_MAP[slotId] || { slotId, label: slotId, desc: '', aspect: 'aspect-video', maxSize: 1200 };

/** Toàn bộ slotId thực sự lưu trong cozy_custom_images (9 vị trí, mood mở rộng thành 5) */
export const ALL_STORABLE_SLOT_IDS = Object.keys(META_MAP);

