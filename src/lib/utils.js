// Tiện ích dùng chung cho CozySpace Desktop
import { readStorage, STORAGE_KEYS } from './storage.js';

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
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
};

export const addDaysISO = (iso, deltaDays = 1) => {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toISODate(d);
};

export const nextRepeatDateISO = (iso, repeat) => {
  const base = iso && iso >= todayISO() ? iso : todayISO();
  if (repeat === 'daily') return addDaysISO(base, 1);
  if (repeat === 'weekly') return addDaysISO(base, 7);
  if (repeat === 'monthly') {
    const d = fromISODate(base);
    d.setMonth(d.getMonth() + 1);
    return toISODate(d);
  }
  return null;
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
  if (!ts) return 'vừa xong';
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

export const formatVND = (n) => `${(Number(n) || 0).toLocaleString('vi-VN')}₫`;

export const parseCurrencyInput = (raw) =>
  Math.round(Number(String(raw || '').replace(/[^\d]/g, '')) || 0);

export const formatThousandsInput = (raw) => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};

/** Xuất tệp CSV chuẩn UTF-8 BOM (mở bằng Microsoft Excel không bị lỗi font tiếng Việt) */
export function exportToCsv(filename, headers, rows) {
  const escapeCell = (v) => {
    const str = String(v ?? '');
    if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextFile(filename, text, mime = 'text/markdown;charset=utf-8;') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Trích videoId từ mọi định dạng link YouTube:
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

function isSoundEnabled() {
  try {
    const settings = readStorage(STORAGE_KEYS.SETTINGS);
    return settings?.soundEnabled !== false;
  } catch {
    return true;
  }
}

/** Âm báo chuông gió ấm áp khi hoàn thành Pomodoro */
export function playChime() {
  if (!isSoundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.05);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {
    /* bỏ qua */
  }
}

/** Âm hiệu "pop" nhẹ như chạm giấy khi gạch hoàn thành việc cần làm */
export function playTickSound() {
  if (!isSoundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
    setTimeout(() => ctx.close(), 300);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Bộ tổng hợp Âm thanh trắng Offline (WebAudio thuần, 0KB file ngoài, hoạt động không cần Internet):
 * - 'rain': Tiếng mưa rơi hiên nhà
 * - 'fire': Tiếng lửa trại ấm áp
 * - 'waves': Sóng biển vỗ nhẹ
 * - 'cafe': Không gian quán nhỏ yên tĩnh
 */
class ProceduralAmbientMixer {
  constructor() {
    this.ctx = null;
    this.nodes = {};
  }

  ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  createNoiseBuffer(ctx, type = 'pink') {
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.2;
      }
    } else if (type === 'crackle') {
      let brown = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.025 * white) / 1.025;
        const pop = Math.random() > 0.9987 ? (Math.random() * 1.4 - 0.3) : 0;
        data[i] = brown * 2.2 + pop * 0.45;
      }
    } else {
      // Pink noise êm dịu cho tiếng mưa
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  setVolume(id, volume) {
    const vol = Math.max(0, Math.min(1, Number(volume) || 0));
    if (vol <= 0.005) {
      this.stop(id);
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.nodes[id]) {
      this.nodes[id].gain.gain.setTargetAtTime(vol * 0.35, ctx.currentTime, 0.08);
      return;
    }

    const src = ctx.createBufferSource();
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.setTargetAtTime(vol * 0.35, ctx.currentTime, 0.15);

    let lfo = null;
    if (id === 'rain') {
      src.buffer = this.createNoiseBuffer(ctx, 'pink');
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
    } else if (id === 'fire') {
      src.buffer = this.createNoiseBuffer(ctx, 'crackle');
      filter.type = 'bandpass';
      filter.frequency.value = 650;
      filter.Q.value = 0.6;
    } else if (id === 'waves') {
      src.buffer = this.createNoiseBuffer(ctx, 'brown');
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.14; // Chu kỳ sóng vỗ ~7 giây
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain).connect(filter.frequency);
      lfo.start();
    } else {
      // cafe warm murmur
      src.buffer = this.createNoiseBuffer(ctx, 'brown');
      filter.type = 'bandpass';
      filter.frequency.value = 380;
      filter.Q.value = 0.45;
    }

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    this.nodes[id] = { src, filter, gain, lfo };
  }

  stop(id) {
    const entry = this.nodes[id];
    if (!entry) return;
    delete this.nodes[id];
    try {
      const ctx = this.ctx;
      if (ctx) {
        entry.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.06);
      }
      setTimeout(() => {
        try {
          entry.src.stop();
          entry.lfo?.stop?.();
          entry.src.disconnect();
          entry.gain.disconnect();
        } catch {
          /* ignore */
        }
      }, 180);
    } catch {
      /* ignore */
    }
  }

  stopAll() {
    Object.keys(this.nodes).forEach((k) => this.stop(k));
  }
}

export const ambientMixer = new ProceduralAmbientMixer();

/**
 * Đọc tệp ảnh, nén sang WebP chất lượng cao và:
 * - Trên Electron: lưu thẳng thành tệp thật trên ổ cứng (`CozySpaceData/media/`) -> trả về `cozy-media://local/...`
 * - Trên Web: trả về chuỗi DataURL đã nén.
 */
export async function fileToCompressedDataURL(file, maxSize = 1800, quality = 0.86, prefix = 'img') {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn một tệp hình ảnh.');
  }

  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  let processedDataUrl = rawDataUrl;

  // Giữ nguyên SVG hoặc ảnh động GIF để không mất chuyển động / độ nét vector
  if (file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
    processedDataUrl = await new Promise((resolve, reject) => {
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
        let out = canvas.toDataURL('image/webp', quality);
        if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/png');
        resolve(out.length < rawDataUrl.length ? out : rawDataUrl);
      };
      img.src = rawDataUrl;
    });
  }

  // Trên Electron: ghi trực tiếp xuống ổ cứng máy tính
  if (typeof window !== 'undefined' && typeof window.cozyEnv?.saveMediaDataUrl === 'function') {
    const saved = await window.cozyEnv.saveMediaDataUrl(processedDataUrl, prefix);
    if (saved?.ok && saved.url) return saved.url;
  }

  return processedDataUrl;
}
