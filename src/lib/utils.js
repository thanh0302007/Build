// Tiện ích dùng chung cho CozySpace

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const pad = (n) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' theo giờ địa phương */
export const toISODate = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

/** 'YYYY-MM-DD' -> Date (giờ địa phương, tránh lệch múi giờ) */
export const fromISODate = (s) => {
  const [y, m, d] = (s || '').split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const formatLongDate = (d = new Date()) =>
  `${WEEKDAYS_FULL[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;

export const formatShortDate = (iso) => {
  const d = fromISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export const formatRelativeTime = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} ngày trước`;
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const getGreeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 5) return { text: 'Khuya rồi, nghỉ ngơi nhé', emoji: '🌙' };
  if (h < 11) return { text: 'Chào buổi sáng', emoji: '🌤️' };
  if (h < 14) return { text: 'Chào buổi trưa', emoji: '☀️' };
  if (h < 18) return { text: 'Chào buổi chiều', emoji: '🍵' };
  return { text: 'Chào buổi tối', emoji: '🌸' };
};

/**
 * Trích videoId từ mọi định dạng link YouTube (Quy định IV.2):
 * youtube.com/watch?v=, youtu.be/, youtube.com/live/, /embed/, /shorts/, /v/,
 * music.youtube.com, m.youtube.com, hoặc chính videoId 11 ký tự.
 */
export function extractYouTubeId(url) {
  if (!url) return null;
  const input = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => ['live', 'embed', 'shorts', 'v', 'e'].includes(p));
      if (idx !== -1 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }
  } catch {
    /* rơi xuống regex dự phòng */
  }

  const m = input.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

/** Âm báo "ting" nhẹ nhàng bằng WebAudio (không cần file âm thanh) */
export function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    setTimeout(() => ctx.close(), 1800);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Đọc file ảnh -> Base64, tự thu nhỏ để tiết kiệm localStorage.
 * Giữ nguyên SVG/GIF (để không mất vector/animation) nếu dung lượng nhỏ.
 */
export function fileToCompressedDataURL(file, maxSize = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn một tệp hình ảnh.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload = () => {
      const dataUrl = reader.result;
      if ((file.type === 'image/svg+xml' || file.type === 'image/gif') && file.size < 1.5 * 1024 * 1024) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp ảnh bị lỗi hoặc không hỗ trợ.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // webp giữ được nền trong suốt (mascot, sticker) và nhẹ hơn png
        let out = canvas.toDataURL('image/webp', quality);
        if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/png');
        resolve(out.length < dataUrl.length ? out : dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

