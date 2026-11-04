// (3) Khu vực Tập trung: Pomodoro + Living Companion + Âm thanh thiên nhiên Offline + Trình phát nhạc Lofi YouTube
import { useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings2,
  Plus,
  Trash2,
  Music2,
  Link2,
  Square,
  Radio,
  Check,
  X,
  Volume2,
  Target,
  Headphones,
  CloudRain,
  Flame,
  Waves,
  Coffee,
  Moon,
  Heart,
  Timer,
  Disc3,
} from 'lucide-react';
import { Card, Button, Input, Select, PageHeader, IconButton, cx } from '../components/ui.jsx';
import LivingCompanion from '../components/LivingCompanion.jsx';
import { usePomodoro, formatClock, MODE_META } from '../context/PomodoroContext.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { extractYouTubeId, todayISO } from '../lib/utils.js';
import { applyToggleTodoList } from '../components/TodoItem.jsx';
import { useToast } from '../components/Toast.jsx';

export const PRESET_TRACKS = [
  { title: 'Lofi Hip Hop Radio', desc: 'Lofi Girl · nhạc học bài', videoId: 'jfKfPfyJRdk', icon: Headphones, dotColor: '#E5989B' },
  { title: 'Peaceful Piano Radio', desc: 'Piano nhẹ nhàng tập trung', videoId: '4oStw0r33so', icon: Music2, dotColor: '#B8A1D9' },
  { title: 'Tiếng mưa rơi trên phố', desc: 'Rain sounds thư giãn', videoId: 'mPZkdNFkNps', icon: CloudRain, dotColor: '#6B9080' },
  { title: 'Lofi Sleep / Chill', desc: 'Lofi Girl · thư giãn, đọc sách', videoId: 'rUxyKA_-grg', icon: Moon, dotColor: '#D4B46A' },
  { title: 'Synthwave Radio', desc: 'Lofi Girl · retro chill', videoId: '4xDzrJKXOOY', icon: Radio, dotColor: '#A67B5B' },
];

const AMBIENT_SOUNDS = [
  { id: 'rain', label: 'Mưa hiên nhà', icon: CloudRain },
  { id: 'fire', label: 'Lửa trại ấm', icon: Flame },
  { id: 'waves', label: 'Sóng biển nhẹ', icon: Waves },
  { id: 'cafe', label: 'Quán nhỏ', icon: Coffee },
];

function SoundWaveBars({ active }) {
  if (!active) return null;
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
      <span
        className="lofi-wave-bar-1 h-2.5 w-[2px] rounded-full"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <span
        className="lofi-wave-bar-2 h-3 w-[2px] rounded-full"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <span
        className="lofi-wave-bar-3 h-2 w-[2px] rounded-full"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <span
        className="lofi-wave-bar-4 h-3 w-[2px] rounded-full"
        style={{ backgroundColor: 'var(--accent)' }}
      />
    </span>
  );
}

function LofiTurntableStandby({ onSelectPreset }) {
  return (
    <div
      className="flex h-full min-h-[248px] flex-col items-center justify-center gap-4 px-5 py-6 text-center"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      {/* Mâm đĩa than / Cassette Lofi tối giản */}
      <div
        className="relative flex items-center gap-6 rounded-3xl px-6 py-4"
        style={{
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Đĩa than Vinyl */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#2A2422] shadow-sm">
          {/* Rãnh đĩa */}
          <div className="h-20 w-20 rounded-full border border-white/10" />
          <div className="absolute h-14 w-14 rounded-full border border-white/10" />
          {/* Nhãn tâm đĩa đồng bộ màu --accent */}
          <div
            className="absolute flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <div className="h-2 w-2 rounded-full bg-[#2A2422]" />
          </div>
        </div>

        {/* Cần đọc đĩa than (Tonearm) & Cửa sổ băng Cassette */}
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <Disc3 size={13} strokeWidth={1.75} className="text-cozy-accent" />
            <span>Cozy Lofi Deck · Standby</span>
          </div>
          <p className="mt-1 text-sm font-bold text-cozy-text">
            Chọn một giai điệu để đặt kim đĩa
          </p>
          <p className="mt-0.5 max-w-[230px] text-xs leading-relaxed text-[var(--text-muted)]">
            Bấm kênh Lofi bên dưới, dán link YouTube hoặc bật âm thanh thiên nhiên Offline
          </p>

          {/* Nút bật nhanh kênh đầu tiên */}
          {onSelectPreset && (
            <button
              type="button"
              onClick={() => onSelectPreset(PRESET_TRACKS[0])}
              style={{ border: '1px solid var(--border-subtle)' }}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-transparent px-3 py-1 text-xs font-bold text-cozy-text transition hover:bg-black/5"
            >
              <Play size={12} strokeWidth={1.75} className="text-cozy-accent" />
              <span>Phát Lofi Hip Hop Radio</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct, isBreak, children }) {
  const r = 120;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[272px]">
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="140" cy="140" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          stroke={isBreak ? 'rgb(var(--cozy-matcha))' : 'var(--accent)'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.35s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function SettingField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <Input
          type="number"
          min={1}
          max={180}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1.5 text-center"
        />
        <span className="text-xs text-[var(--text-muted)]">phút</span>
      </div>
    </label>
  );
}

export default function FocusZone() {
  const pomo = usePomodoro();
  const {
    config,
    setConfig,
    mode,
    status,
    remainingMs,
    totalMs,
    isBreak,
    focusTarget,
    setFocusTarget,
    currentTrack: current,
    selectTrack: setCurrent,
    stopTrack,
    ambientVolumes,
    setAmbientVolume,
    stopAllAmbient,
    hasActiveAmbient,
    ytIframeRef,
  } = pomo;

  const [todos, setTodos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [subjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const { toast, confirm } = useToast();

  const [showSettings, setShowSettings] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [linkError, setLinkError] = useState('');

  const today = todayISO();
  const pct = totalMs ? 1 - remainingMs / totalMs : 0;
  const sessions = config.completedSessions || 0;
  const todayStats = config.dailyHistory?.[today] || { sessions: 0, minutes: 0 };
  const cycleDone = sessions % 4;
  const youtubeLinks = config.youtubeLinks || [];

  const activeTodos = useMemo(
    () => todos.filter((t) => !t.completed).slice(0, 25),
    [todos]
  );

  const updateDuration = (key, v) => {
    const n = Math.max(1, Math.min(180, parseInt(v, 10) || 1));
    setConfig((prev) => ({ ...prev, [key]: n }));
  };

  const handleSelectTarget = (val) => {
    if (!val) {
      setFocusTarget(null);
      return;
    }
    const [kind, id] = val.split('::');
    if (kind === 'todo') {
      const found = todos.find((t) => t.id === id);
      if (found) setFocusTarget({ type: 'todo', id: found.id, title: found.title });
    } else if (kind === 'subject') {
      const found = subjects.find((s) => s.id === id);
      if (found) setFocusTarget({ type: 'subject', id: found.id, title: `Môn: ${found.name}` });
    }
  };

  const completeFocusedTodo = () => {
    if (!focusTarget || focusTarget.type !== 'todo') return;
    setTodos((prev) => applyToggleTodoList(prev, focusTarget.id));
    toast({ message: `Đã hoàn thành: "${focusTarget.title}"!` });
    setFocusTarget(null);
  };

  const parseInputLink = () => {
    const videoId = extractYouTubeId(linkInput);
    if (!videoId) {
      setLinkError('Link YouTube chưa hợp lệ. Hỗ trợ: youtube.com/watch?v=..., youtu.be/..., youtube.com/live/...');
      return null;
    }
    setLinkError('');
    return videoId;
  };

  const playInput = () => {
    const videoId = parseInputLink();
    if (videoId) setCurrent({ title: titleInput.trim() || 'Video YouTube', videoId });
  };

  const saveInput = () => {
    const videoId = parseInputLink();
    if (!videoId) return;
    if (youtubeLinks.some((l) => l.videoId === videoId)) {
      setLinkError('Link này đã có trong danh sách yêu thích rồi.');
      return;
    }
    const item = { title: titleInput.trim() || `Video ${youtubeLinks.length + 1}`, url: linkInput.trim(), videoId };
    setConfig((prev) => ({ ...prev, youtubeLinks: [...(prev.youtubeLinks || []), item] }));
    setLinkInput('');
    setTitleInput('');
    toast({ message: `Đã lưu "${item.title}" vào danh sách yêu thích!` });
  };

  const removeLink = (item) => {
    setConfig((prev) => ({
      ...prev,
      youtubeLinks: (prev.youtubeLinks || []).filter((l) => l.videoId !== item.videoId),
    }));
    toast({
      message: `Đã xóa "${item.title}" khỏi yêu thích`,
      onUndo: () =>
        setConfig((prev) => ({ ...prev, youtubeLinks: [...(prev.youtubeLinks || []), item] })),
    });
  };

  const handleIframeLoad = () => {
    try {
      const win = ytIframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <PageHeader
        icon={Headphones}
        title="Góc tập trung"
        subtitle="Pomodoro gắn liền mục tiêu, hòa quyện âm thanh trắng Offline & giai điệu YouTube yêu thích"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* CỘT TRÁI: POMODORO + LIVING COMPANION + ÂM THANH THIÊN NHIÊN OFFLINE */}
        <div className="space-y-6 xl:col-span-2">
          <Card tone={isBreak ? 'white' : 'blush'} className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <div
                className="flex flex-1 gap-1 rounded-2xl p-1"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                {Object.entries(MODE_META).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pomo.switchMode(k)}
                    className={cx(
                      'flex-1 rounded-xl py-2 text-xs font-bold transition',
                      mode === k
                        ? k === 'work'
                          ? 'bg-cozy-peach text-[#2A2120]'
                          : 'bg-cozy-matcha text-[#223026]'
                        : 'text-[var(--text-muted)] hover:text-cozy-text'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <IconButton
                title="Cài đặt thời gian & tự động chuyển phiên"
                active={showSettings}
                onClick={() => setShowSettings((s) => !s)}
              >
                <Settings2 size={17} />
              </IconButton>
            </div>

            {/* Chọn mục tiêu đang tập trung (Dòng phẳng) */}
            <div
              className="mb-4 pb-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {focusTarget ? (
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    <Target size={14} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
                    <span className="break-words font-bold text-cozy-text">{focusTarget.title}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {focusTarget.type === 'todo' && (
                      <button
                        type="button"
                        onClick={completeFocusedTodo}
                        style={{ border: '1px solid var(--border-subtle)' }}
                        className="inline-flex items-center gap-1 rounded-xl bg-transparent px-2 py-1 text-[11px] font-bold text-cozy-text hover:bg-black/5"
                        title="Đánh dấu xong việc này"
                      >
                        <Check size={12} /> Xong việc
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFocusTarget(null)}
                      className="rounded-lg p-1 text-[var(--text-muted)] hover:text-cozy-text"
                      title="Bỏ chọn mục tiêu"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <Select
                  value=""
                  onChange={(e) => handleSelectTarget(e.target.value)}
                  className="w-full border-0 bg-transparent py-1 text-xs font-semibold text-[var(--text-muted)] focus:ring-0"
                >
                  <option value="">Gắn phiên tập trung với một đầu việc hoặc môn học (tùy chọn)...</option>
                  {activeTodos.length > 0 && (
                    <optgroup label="Việc cần làm">
                      {activeTodos.map((t) => (
                        <option key={t.id} value={`todo::${t.id}`}>
                          {t.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {subjects.length > 0 && (
                    <optgroup label="Sổ tay môn học">
                      {subjects.map((s) => (
                        <option key={s.id} value={`subject::${s.id}`}>
                          Môn: {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              )}
            </div>

            {showSettings && (
              <div
                className="mb-5 space-y-3 pb-4 animate-pop-in"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="grid grid-cols-3 gap-3">
                  <SettingField label="Tập trung" value={config.pomodoroWork} onChange={(v) => updateDuration('pomodoroWork', v)} />
                  <SettingField label="Nghỉ ngắn" value={config.pomodoroShort} onChange={(v) => updateDuration('pomodoroShort', v)} />
                  <SettingField label="Nghỉ dài" value={config.pomodoroLong} onChange={(v) => updateDuration('pomodoroLong', v)} />
                </div>

                <div
                  className="space-y-1.5 pt-2.5 text-xs"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <label className="flex cursor-pointer items-center justify-between text-cozy-text">
                    <span>Tự động đếm giờ nghỉ khi xong phiên học</span>
                    <input
                      type="checkbox"
                      checked={Boolean(config.autoStartBreak)}
                      onChange={(e) => setConfig((p) => ({ ...p, autoStartBreak: e.target.checked }))}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between text-cozy-text">
                    <span>Tự động vào phiên học mới sau giờ nghỉ</span>
                    <input
                      type="checkbox"
                      checked={Boolean(config.autoStartWork)}
                      onChange={(e) => setConfig((p) => ({ ...p, autoStartWork: e.target.checked }))}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </label>
                </div>

                <div
                  className="flex items-center justify-between pt-2 text-xs text-[var(--text-muted)]"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <span>Cứ 4 phiên tập trung có 1 lần nghỉ dài</span>
                  <button
                    type="button"
                    className="font-bold text-cozy-accent hover:underline"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Đặt lại tổng số phiên Pomodoro?',
                        message: 'Số phiên tích lũy sẽ được đưa về 0.',
                        confirmLabel: 'Đặt lại về 0',
                      });
                      if (ok) setConfig((p) => ({ ...p, completedSessions: 0 }));
                    }}
                  >
                    Đặt lại số phiên
                  </button>
                </div>
              </div>
            )}

            <ProgressRing pct={pct} isBreak={isBreak}>
              <LivingCompanion
                isFocusing={status === 'running' && !isBreak}
                isBreak={isBreak}
                size="md"
                className="h-[46%] w-[46%]"
              />
              <p className="mt-1 text-5xl font-bold tabular-nums text-cozy-text">{formatClock(remainingMs)}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                {status === 'running'
                  ? isBreak
                    ? 'Thư giãn mắt chút nhé~'
                    : 'Đang tập trung sâu...'
                  : status === 'paused'
                    ? 'Đang tạm dừng'
                    : 'Chạm vào mèo nhỏ để khích lệ nhé~'}
              </p>
            </ProgressRing>

            <div className="mt-5 flex items-center justify-center gap-3">
              <IconButton
                title="Đặt lại đồng hồ"
                onClick={pomo.reset}
                style={{ border: '1px solid var(--border-subtle)' }}
                className="h-11 w-11"
              >
                <RotateCcw size={18} />
              </IconButton>
              {status === 'running' ? (
                <Button size="lg" onClick={pomo.pause} className="min-w-[150px]">
                  <Pause size={18} /> Tạm dừng
                </Button>
              ) : (
                <Button size="lg" variant={isBreak ? 'secondary' : 'primary'} onClick={pomo.start} className="min-w-[150px]">
                  <Play size={18} /> {status === 'paused' ? 'Tiếp tục' : 'Bắt đầu'}
                </Button>
              )}
              <IconButton
                title="Chuyển qua phiên tiếp theo"
                onClick={pomo.skip}
                style={{ border: '1px solid var(--border-subtle)' }}
                className="h-11 w-11"
              >
                <SkipForward size={18} />
              </IconButton>
            </div>

            <div
              className="mt-5 flex items-center justify-between pt-3.5"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Hôm nay · Tổng cộng</p>
                <p className="flex items-center gap-1.5 text-sm font-bold text-cozy-text">
                  <Timer size={14} strokeWidth={1.75} className="text-cozy-accent" />
                  <span>
                    {todayStats.sessions} phiên ({todayStats.minutes} phút) · Tổng {sessions}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5" title="Tiến độ chu kỳ 4 phiên">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: i < cycleDone ? 'var(--accent)' : 'var(--border-subtle)',
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* BỘ TRỘN ÂM THANH THIÊN NHIÊN OFFLINE (4 Thanh trượt phẳng + Sóng âm nhẹ khi > 0%) */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-cozy-text">
                  <Volume2 size={17} strokeWidth={1.75} className="text-cozy-accent" />
                  <span>Âm thanh thiên nhiên Offline</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Hoạt động ngay cả khi không có mạng, có thể bật kèm nhạc Lofi
                </p>
              </div>
              {hasActiveAmbient && (
                <Button variant="ghost" size="sm" onClick={stopAllAmbient}>
                  Tắt hết
                </Button>
              )}
            </div>

            <div>
              {AMBIENT_SOUNDS.map((s, idx) => {
                const vol = ambientVolumes[s.id] || 0;
                const active = vol > 0.01;
                const SoundIcon = s.icon;
                return (
                  <div
                    key={s.id}
                    style={{
                      borderBottom:
                        idx < AMBIENT_SOUNDS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => setAmbientVolume(s.id, active ? 0 : 0.55)}
                      title={active ? `Tắt ${s.label}` : `Bật ${s.label}`}
                      className="flex min-w-[138px] shrink-0 items-center gap-2 text-left"
                    >
                      <SoundIcon
                        size={15}
                        strokeWidth={1.75}
                        className={active ? 'text-cozy-accent' : 'text-[var(--text-muted)]'}
                      />
                      <span
                        className={cx(
                          'whitespace-nowrap text-xs transition',
                          active ? 'font-bold text-cozy-text' : 'font-medium text-[var(--text-muted)]'
                        )}
                      >
                        {s.label}
                      </span>
                      <SoundWaveBars active={active} />
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(vol * 100)}
                      onChange={(e) => setAmbientVolume(s.id, Number(e.target.value) / 100)}
                      style={{ accentColor: 'var(--accent)' }}
                      className="h-1.5 flex-1 cursor-pointer"
                    />

                    <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                      {Math.round(vol * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* CỘT PHẢI: TRÌNH PHÁT NHẠC YOUTUBE (NỀN --bg-card ĐỒNG BỘ + ĐĨA THAN LOFI) */}
        <div className="space-y-6 xl:col-span-3">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-cozy-text">
                <Music2 size={18} strokeWidth={1.75} className="text-cozy-accent" />
                <span>{current ? current.title : 'Trình phát nhạc YouTube'}</span>
              </h2>
              {current && (
                <Button variant="ghost" size="sm" onClick={stopTrack}>
                  <Square size={13} /> Dừng phát
                </Button>
              )}
            </div>

            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="aspect-video min-h-[248px] w-full">
                {current ? (
                  <iframe
                    ref={ytIframeRef}
                    key={current.videoId}
                    title={current.title}
                    onLoad={handleIframeLoad}
                    src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&enablejsapi=1`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="pointer-events-auto relative z-10 block h-full min-h-[248px] w-full border-0"
                  />
                ) : (
                  <LofiTurntableStandby onSelectPreset={setCurrent} />
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    className="pl-9"
                    placeholder="Dán link YouTube (watch, youtu.be, live, shorts...)"
                    value={linkInput}
                    onChange={(e) => {
                      setLinkInput(e.target.value);
                      setLinkError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && playInput()}
                  />
                </div>
                <Input
                  className="w-48"
                  placeholder="Tên gợi nhớ (tùy chọn)"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={playInput} disabled={!linkInput.trim()}>
                  <Play size={15} /> Phát ngay
                </Button>
                <Button variant="soft" onClick={saveInput} disabled={!linkInput.trim()}>
                  <Plus size={15} /> Lưu vào yêu thích
                </Button>
              </div>
              {linkError && <p className="text-xs font-semibold text-cozy-accent">{linkError}</p>}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-cozy-text">
                <Radio size={16} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Kênh học bài 1 chạm</span>
              </h3>
              <ul>
                {PRESET_TRACKS.map((t, idx) => {
                  const TrackIcon = t.icon || Music2;
                  const isPlaying = current?.videoId === t.videoId;
                  return (
                    <li
                      key={t.videoId}
                      style={{
                        borderBottom:
                          idx < PRESET_TRACKS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setCurrent(t)}
                        className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-black/[0.015]"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: t.dotColor || 'var(--accent)' }}
                        />
                        <TrackIcon size={16} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-cozy-text">
                            {t.title}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)]">{t.desc}</span>
                        </span>
                        {isPlaying ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-cozy-accent">
                            <SoundWaveBars active />
                            <span>Đang phát</span>
                          </span>
                        ) : (
                          <Play size={14} className="shrink-0 text-[var(--text-muted)]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-cozy-text">
                <Heart size={16} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Danh sách yêu thích</span>
              </h3>
              {youtubeLinks.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Chưa có link nào. Dán link YouTube phía trên rồi bấm <b>Lưu vào yêu thích</b> nhé!
                </p>
              ) : (
                <ul className="cozy-scroll max-h-72 overflow-y-auto pr-1">
                  {youtubeLinks.map((l, idx) => {
                    const isPlaying = current?.videoId === l.videoId;
                    return (
                      <li
                        key={l.videoId}
                        style={{
                          borderBottom:
                            idx < youtubeLinks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}
                        className="group flex items-center gap-2 py-2.5 transition hover:bg-black/[0.015]"
                      >
                        <button
                          type="button"
                          onClick={() => setCurrent(l)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: isPlaying ? 'var(--accent)' : 'var(--text-muted)' }}
                          />
                          <Music2 size={15} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold text-cozy-text">
                              {l.title}
                            </span>
                            <span className="block font-mono text-[11px] text-[var(--text-muted)]">
                              {l.videoId}
                            </span>
                          </span>
                        </button>
                        <IconButton
                          title="Xóa khỏi yêu thích"
                          onClick={() => removeLink(l)}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
