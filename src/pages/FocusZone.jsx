// (3) Khu vực Tập trung: Pomodoro + Nhạc YouTube
import { useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Settings2, Plus, Trash2, Music2, Link2, Square, Radio } from 'lucide-react';
import { Card, Button, Input, PageHeader, IconButton, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import { MascotFocusSvg, MascotBreakSvg } from '../assets/defaultSvgs.jsx';
import { usePomodoro, formatClock, MODE_META } from '../context/PomodoroContext.jsx';
import { extractYouTubeId } from '../lib/utils.js';

// Danh sách phát có sẵn (1 chạm). Link live có thể đổi theo thời gian — người dùng có thể lưu link riêng.
export const PRESET_TRACKS = [
  { title: 'Lofi Hip Hop Radio', desc: 'Lofi Girl · nhạc học bài', videoId: 'jfKfPfyJRdk', emoji: '🎧', tint: 'bg-cozy-peach/25' },
  { title: 'Peaceful Piano Radio', desc: 'Piano nhẹ nhàng tập trung', videoId: '4oStw0r33so', emoji: '🎹', tint: 'bg-cozy-lavender' },
  { title: 'Tiếng mưa rơi', desc: 'Rain sounds thư giãn', videoId: 'mPZkdNFkNps', emoji: '🌧️', tint: 'bg-cozy-matcha/30' },
  { title: 'Lofi Sleep / Chill', desc: 'Lofi Girl · thư giãn, ngủ ngon', videoId: 'rUxyKA_-grg', emoji: '🌙', tint: 'bg-cozy-butter' },
  { title: 'Synthwave Radio', desc: 'Lofi Girl · retro chill', videoId: '4xDzrJKXOOY', emoji: '🌆', tint: 'bg-cozy-peach/20' },
];

function ProgressRing({ pct, isBreak, children }) {
  const r = 120;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="140" cy="140" r={r} fill="none" stroke="#F0EAE1" strokeWidth="12" />
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          stroke={isBreak ? '#A3C9A8' : '#F4ACB7'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function SettingField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-cozy-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <Input type="number" min={1} max={180} value={value} onChange={(e) => onChange(e.target.value)} className="text-center" />
        <span className="text-xs text-cozy-muted">phút</span>
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
    currentTrack: current,
    selectTrack: setCurrent,
    stopTrack,
    ytIframeRef,
  } = pomo;
  const [showSettings, setShowSettings] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [linkError, setLinkError] = useState('');

  const pct = totalMs ? 1 - remainingMs / totalMs : 0;
  const sessions = config.completedSessions || 0;
  const cycleDone = sessions % 4;
  const youtubeLinks = config.youtubeLinks || [];

  const updateDuration = (key, v) => {
    const n = Math.max(1, Math.min(180, parseInt(v, 10) || 1));
    setConfig((prev) => ({ ...prev, [key]: n }));
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
      setLinkError('Link này đã có trong danh sách yêu thích rồi nè 💗');
      return;
    }
    const item = { title: titleInput.trim() || `Video ${youtubeLinks.length + 1}`, url: linkInput.trim(), videoId };
    setConfig((prev) => ({ ...prev, youtubeLinks: [...(prev.youtubeLinks || []), item] }));
    setLinkInput('');
    setTitleInput('');
  };

  const removeLink = (videoId) =>
    setConfig((prev) => ({ ...prev, youtubeLinks: (prev.youtubeLinks || []).filter((l) => l.videoId !== videoId) }));

  return (
    <div>
      <PageHeader emoji="🎧" title="Góc tập trung" subtitle="Pomodoro nhẹ nhàng cùng giai điệu yêu thích — học sâu, nghỉ đủ" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* POMODORO */}
        <Card tone={isBreak ? 'white' : 'blush'} className="p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex flex-1 gap-1 rounded-2xl bg-white p-1 ring-1 ring-cozy-line">
              {Object.entries(MODE_META).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pomo.switchMode(k)}
                  className={cx(
                    'flex-1 rounded-xl py-2 text-xs font-bold transition',
                    mode === k ? (k === 'work' ? 'bg-cozy-peach text-white' : 'bg-cozy-matcha text-white') : 'text-cozy-muted hover:text-cozy-text'
                  )}
                >
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
            <IconButton title="Cài đặt thời gian" active={showSettings} onClick={() => setShowSettings((s) => !s)}>
              <Settings2 size={17} />
            </IconButton>
          </div>

          {showSettings && (
            <div className="mb-5 rounded-2xl border border-cozy-line bg-white p-4 animate-pop-in">
              <div className="grid grid-cols-3 gap-3">
                <SettingField label="Tập trung" value={config.pomodoroWork} onChange={(v) => updateDuration('pomodoroWork', v)} />
                <SettingField label="Nghỉ ngắn" value={config.pomodoroShort} onChange={(v) => updateDuration('pomodoroShort', v)} />
                <SettingField label="Nghỉ dài" value={config.pomodoroLong} onChange={(v) => updateDuration('pomodoroLong', v)} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-cozy-muted">
                <span>Cứ 4 phiên tập trung sẽ có 1 lần nghỉ dài</span>
                <button
                  type="button"
                  className="font-semibold text-cozy-peach hover:underline"
                  onClick={() => window.confirm('Đặt lại số phiên đã hoàn thành về 0?') && setConfig((p) => ({ ...p, completedSessions: 0 }))}
                >
                  Đặt lại số phiên
                </button>
              </div>
            </div>
          )}

          <ProgressRing pct={pct} isBreak={isBreak}>
            <ImageSlot
              slotId={isBreak ? 'mascot_break' : 'mascot_focus'}
              defaultSvg={isBreak ? <MascotBreakSvg /> : <MascotFocusSvg />}
              fit="contain"
              compact
              buttonPosition="top-right"
              className="h-[46%] w-[46%] rounded-full"
            />
            <p className="mt-1 text-5xl font-bold tabular-nums text-cozy-text">{formatClock(remainingMs)}</p>
            <p className="mt-1 text-xs font-semibold text-cozy-muted">
              {status === 'running' ? (isBreak ? 'Thư giãn nào~' : 'Đang tập trung...') : status === 'paused' ? 'Đang tạm dừng' : 'Sẵn sàng chưa?'}
            </p>
          </ProgressRing>

          <div className="mt-6 flex items-center justify-center gap-3">
            <IconButton title="Đặt lại" onClick={pomo.reset} className="h-11 w-11 bg-white ring-1 ring-cozy-line">
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
            <IconButton title="Bỏ qua phiên này" onClick={pomo.skip} className="h-11 w-11 bg-white ring-1 ring-cozy-line">
              <SkipForward size={18} />
            </IconButton>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-cozy-line">
            <div>
              <p className="text-xs font-semibold text-cozy-muted">Phiên đã hoàn thành</p>
              <p className="text-lg font-bold text-cozy-text">🍅 {sessions}</p>
            </div>
            <div className="flex items-center gap-1.5" title="Tiến độ chu kỳ 4 phiên">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cx('h-3 w-3 rounded-full', i < cycleDone ? 'bg-cozy-peach' : 'bg-cozy-line')} />
              ))}
            </div>
          </div>
        </Card>

        {/* YOUTUBE */}
        <div className="space-y-6 xl:col-span-3">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-cozy-text">
                <Music2 size={18} className="text-cozy-peach" />
                {current ? current.title : 'Trình phát nhạc'}
              </h2>
              {current && (
                <Button variant="ghost" size="sm" onClick={stopTrack}>
                  <Square size={13} /> Dừng phát
                </Button>
              )}
            </div>
            <div className="relative overflow-hidden rounded-3xl border-4 border-cozy-blush bg-cozy-lavender/40 shadow-sm ring-1 ring-cozy-line">
              <div className="aspect-video min-h-[240px] w-full">
                {current ? (
                  <iframe
                    ref={ytIframeRef}
                    key={current.videoId}
                    title={current.title}
                    src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&enablejsapi=1`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="pointer-events-auto relative z-10 block h-full min-h-[240px] w-full border-0"
                  />
                ) : (
                  <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center">
                    <div className="text-5xl animate-floaty">🎶</div>
                    <p className="font-bold text-cozy-text">Chọn một giai điệu để bắt đầu</p>
                    <p className="text-sm text-cozy-muted">Bấm vào danh sách bên dưới hoặc dán link YouTube của bạn</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cozy-muted" />
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
                  className="w-44"
                  placeholder="Tên (tùy chọn)"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={playInput} disabled={!linkInput.trim()}>
                  <Play size={15} /> Phát ngay
                </Button>
                <Button variant="soft" onClick={saveInput} disabled={!linkInput.trim()}>
                  <Plus size={15} /> Lưu vào yêu thích
                </Button>
              </div>
              {linkError && <p className="text-xs font-semibold text-cozy-peach">{linkError}</p>}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-cozy-text">
                <Radio size={16} className="text-cozy-matcha" /> Kênh học bài 1 chạm
              </h3>
              <ul className="space-y-2">
                {PRESET_TRACKS.map((t) => (
                  <li key={t.videoId}>
                    <button
                      type="button"
                      onClick={() => setCurrent(t)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition',
                        current?.videoId === t.videoId ? 'border-cozy-peach bg-cozy-blush' : 'border-cozy-line bg-white hover:bg-cozy-blush'
                      )}
                    >
                      <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl text-lg', t.tint)}>{t.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-cozy-text">{t.title}</span>
                        <span className="block truncate text-[11px] text-cozy-muted">{t.desc}</span>
                      </span>
                      {current?.videoId === t.videoId ? (
                        <span className="text-xs font-bold text-cozy-peach">Đang phát</span>
                      ) : (
                        <Play size={14} className="text-cozy-muted" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-cozy-text">💗 Danh sách yêu thích</h3>
              {youtubeLinks.length === 0 ? (
                <p className="rounded-2xl bg-cozy-blush px-4 py-6 text-center text-sm text-cozy-muted">
                  Chưa có link nào. Dán link YouTube phía trên rồi bấm <b>Lưu vào yêu thích</b> nhé!
                </p>
              ) : (
                <ul className="cozy-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
                  {youtubeLinks.map((l) => (
                    <li
                      key={l.videoId}
                      className={cx(
                        'group flex items-center gap-2 rounded-2xl border px-3 py-2 transition',
                        current?.videoId === l.videoId ? 'border-cozy-peach bg-cozy-blush' : 'border-cozy-line bg-white hover:bg-cozy-blush'
                      )}
                    >
                      <button type="button" onClick={() => setCurrent(l)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cozy-butter text-lg">🎵</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-cozy-text">{l.title}</span>
                          <span className="block truncate font-mono text-[10px] text-cozy-muted">{l.videoId}</span>
                        </span>
                      </button>
                      <IconButton title="Xóa khỏi yêu thích" onClick={() => removeLink(l.videoId)} className="opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
