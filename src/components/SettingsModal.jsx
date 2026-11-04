// Trung tâm Cài đặt, Cá nhân hóa & Quản lý Dữ liệu Ổ cứng (SettingsModal.jsx)
import { useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  HardDrive,
  Download,
  Upload,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  RotateCcw,
  Camera,
  FolderSync,
  History,
  Trash2,
  Power,
  Settings,
} from 'lucide-react';
import { Button, Input, Modal, Select, cx } from './ui.jsx';
import { resolveThemeId } from './Sidebar.jsx';
import {
  DEFAULTS,
  exportAllKeysSnapshot,
  getDiskDataDir,
  hydrateStorageMap,
  STORAGE_KEYS,
  useCozyStorage,
} from '../lib/storage.js';
import { todayISO, uid, addDaysISO } from '../lib/utils.js';
import { useToast } from './Toast.jsx';

const THEMES = [
  {
    id: 'sakura-cream',
    name: 'Sakura Cream',
    desc: 'Giấy kem ấm & hồng phấn tĩnh lặng',
    preview: ['#FAF7F2', '#E5989B', '#3D3535'],
  },
  {
    id: 'botanical-matcha',
    name: 'Botanical Matcha',
    desc: 'Lá trà xanh dịu mắt cho giờ học dài',
    preview: ['#F4F7F4', '#6B9080', '#2C3E35'],
  },
  {
    id: 'vintage-cafe',
    name: 'Vintage Cafe',
    desc: 'Màu giấy cũ & hương cà phê trầm ấm',
    preview: ['#F5EFE6', '#A67B5B', '#3E3228'],
  },
  {
    id: 'midnight-lofi',
    name: 'Midnight Lofi',
    desc: 'Rừng đêm tĩnh mịch bảo vệ mắt khuya',
    preview: ['#14241D', '#4ADE80', '#E6F0EC'],
  },
];

function buildSampleDataset() {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const subjId = uid();
  const matId = uid();

  return {
    [STORAGE_KEYS.TODOS]: [
      { id: uid(), title: 'Ôn tập 20 từ vựng IELTS chủ đề Environment', date: today, time: '09:00', priority: 'high', category: 'Học tập', completed: false, subtasks: [{ id: uid(), title: 'Lật hết bộ Flashcard', done: true }, { id: uid(), title: 'Làm bài Quiz kiểm tra', done: false }] },
      { id: uid(), title: 'Uống đủ 2 lít nước & đi bộ thư giãn 20 phút', date: today, priority: 'medium', repeat: 'daily', category: 'Sức khỏe', completed: true, subtasks: [] },
      { id: uid(), title: 'Hoàn thành báo cáo môn Kỹ năng mềm', date: tomorrow, time: '14:30', priority: 'high', category: 'Học tập', completed: false, subtasks: [] },
    ],
    [STORAGE_KEYS.SUBJECTS]: [
      { id: subjId, name: 'Tiếng Anh IELTS', color: '#F4ACB7', coverSlotId: `subject_cover_${subjId}`, createdAt: Date.now() },
    ],
    [STORAGE_KEYS.STUDY_MATERIALS]: [
      {
        id: matId,
        subjectId: subjId,
        title: 'Từ vựng trọng tâm: Environment & Climate',
        content: `# Chủ đề: Environment & Sustainable Living\n\n## 1. Từ vựng cốt lõi\n- **Biodiversity**: Đa dạng sinh học trong một hệ sinh thái tự nhiên.\n- **Carbon footprint**: Tổng lượng khí nhà kính phát thải từ hoạt động của con người.\n- **Renewable energy**: Năng lượng tái tạo (mặt trời, gió, thủy triều).\n- **Mitigate**: Giảm thiểu mức độ nghiêm trọng của biến đổi khí hậu.\n\n> 💡 Mẹo: Bấm nút **🎴 Flashcard** hoặc **📝 Quiz** bên khung Gemini để tự động sinh câu hỏi ôn tập nhé!`,
        type: 'note',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    [STORAGE_KEYS.STUDY_SETS]: [
      {
        id: uid(),
        subjectId: subjId,
        flashcards: [
          { front: 'Biodiversity là gì?', back: 'Đa dạng sinh học trong một hệ sinh thái tự nhiên.', known: true },
          { front: 'Carbon footprint là gì?', back: 'Dấu chân carbon — lượng khí nhà kính phát thải do hoạt động con người.', known: false },
          { front: 'Renewable energy', back: 'Năng lượng tái tạo (điện mặt trời, điện gió...).', known: false },
        ],
        quizzes: [
          {
            question: 'Thuật ngữ nào chỉ tổng lượng khí nhà kính phát thải từ hoạt động của con người?',
            options: ['Biodiversity', 'Carbon footprint', 'Deforestation', 'Habitat loss'],
            correctIndex: 1,
            explanation: 'Carbon footprint là dấu chân carbon đo lượng khí thải nhà kính.',
          },
        ],
      },
    ],
    [STORAGE_KEYS.DIARY_ENTRIES]: [
      {
        id: uid(),
        date: today,
        mood: 'peaceful',
        title: 'Khởi đầu mới tại góc nhỏ CozySpace 🌸',
        content: 'Hôm nay mình bắt đầu sắp xếp lại lịch học và thói quen chi tiêu. Pha một tách trà ấm, bật tiếng mưa rơi nhẹ và cảm thấy mọi thứ thật ngăn nắp, dễ chịu.',
        paperColor: '#FFF9F9',
        photos: [],
      },
    ],
    [STORAGE_KEYS.STICKY_NOTES]: [
      {
        id: uid(),
        content: '✨ Nhấn Ctrl + K ở bất cứ đâu để tìm kiếm nhanh mọi thứ trong CozySpace!',
        color: 'butter',
        isPinned: true,
        updatedAt: Date.now(),
      },
      {
        id: uid(),
        mode: 'checklist',
        content: 'Chuẩn bị góc bàn học',
        checklist: [
          { id: uid(), text: 'Dọn gọn mặt bàn', done: true },
          { id: uid(), text: 'Pha trà hoa cúc ấm', done: true },
          { id: uid(), text: 'Chạy 1 phiên Pomodoro 25 phút', done: false },
        ],
        color: 'matcha',
        isPinned: false,
        updatedAt: Date.now() - 120000,
      },
    ],
    [STORAGE_KEYS.EXPENSES]: {
      monthlyBudget: 4500000,
      monthlyBudgets: { [today.slice(0, 7)]: 4500000 },
      baseBalance: 5000000,
      funds: [
        { id: 'fund_living', name: 'Quỹ Sinh hoạt', emoji: '🍜', color: '#F4ACB7', allocated: 2500000 },
        { id: 'fund_study', name: 'Quỹ Học tập', emoji: '📚', color: '#A3C9A8', allocated: 1200000 },
        { id: 'fund_saving', name: 'Quỹ Tiết kiệm', emoji: '🐷', color: '#FFF3B0', allocated: 2000000 },
      ],
      plannedExpenses: [
        {
          id: uid(),
          month: today.slice(0, 7),
          title: 'Tiền điện nước & Internet tháng này',
          amount: 350000,
          category: 'housing',
          fundId: 'fund_living',
          dueDate: today,
          paid: false,
          paidTxId: null,
        },
        {
          id: uid(),
          month: today.slice(0, 7),
          title: 'Đăng ký tài liệu luyện thi cuối kỳ',
          amount: 180000,
          category: 'study',
          fundId: 'fund_study',
          dueDate: today,
          paid: false,
          paidTxId: null,
        },
      ],
      transactions: [
        { id: uid(), amount: 1500000, type: 'income', category: 'income_scholarship', fundId: '', note: 'Học bổng khuyến khích & trợ cấp', date: today },
        { id: uid(), amount: 45000, type: 'expense', category: 'food', fundId: 'fund_living', note: 'Bữa sáng & trà matcha ấm', date: today },
        { id: uid(), amount: 125000, type: 'expense', category: 'study', fundId: 'fund_study', note: 'Sổ tay ghi chép & bút highlight pastel', date: today },
      ],
    },
  };
}

export default function SettingsModal({ open, onClose }) {
  const [settings, setSettings] = useCozyStorage(STORAGE_KEYS.SETTINGS);
  const { toast, confirm } = useToast();
  const [tab, setTab] = useState('general'); // general | storage
  const [diskInfo, setDiskInfo] = useState(null);
  const webImportRef = useRef(null);

  const isElectron = Boolean(typeof window !== 'undefined' && window.cozyEnv?.isElectron);

  const refreshDiskInfo = () => {
    if (!isElectron) return;
    window.cozyEnv?.getStorageInfo?.().then(setDiskInfo).catch(() => {});
  };

  useEffect(() => {
    if (open) refreshDiskInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  const patch = (partial) => setSettings((prev) => ({ ...prev, ...partial }));

  const handleExport = async () => {
    if (isElectron && window.cozyEnv?.exportBackup) {
      const res = await window.cozyEnv.exportBackup();
      if (res?.ok) {
        toast({ message: `Đã lưu tệp sao lưu tại: ${res.filePath}` });
      }
      return;
    }
    // Web fallback
    const snap = exportAllKeysSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CozySpace-Backup-${todayISO()}.cozybackup.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ message: 'Đã tải xuống tệp sao lưu JSON!' });
  };

  const handleImport = async () => {
    if (isElectron && window.cozyEnv?.importBackup) {
      const ok = await confirm({
        title: 'Khôi phục dữ liệu từ tệp sao lưu?',
        message: 'CozySpace sẽ tự động lưu lại một bản dự phòng hiện tại vào thư mục backups trước khi nạp tệp mới.',
        confirmLabel: 'Chọn tệp khôi phục',
      });
      if (!ok) return;
      const res = await window.cozyEnv.importBackup();
      if (res?.canceled) return;
      if (res?.ok && res.keys) {
        hydrateStorageMap(res.keys);
        setDiskInfo(res.info || null);
        toast({ message: '🎉 Đã khôi phục toàn bộ dữ liệu và hình ảnh thành công!' });
      } else {
        toast({ message: res?.error || 'Không thể khôi phục tệp sao lưu.', tone: 'error' });
      }
      return;
    }
    webImportRef.current?.click();
  };

  const handleWebFileImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const keys = parsed?.keys && typeof parsed.keys === 'object' ? parsed.keys : parsed;
      hydrateStorageMap(keys, true);
      toast({ message: '🎉 Đã nạp tệp sao lưu thành công!' });
    } catch {
      toast({ message: 'Tệp JSON không hợp lệ.', tone: 'error' });
    }
  };

  const handleChangeDataFolder = async () => {
    if (!isElectron || !window.cozyEnv?.changeDataFolder) return;
    const res = await window.cozyEnv.changeDataFolder();
    if (res?.canceled) return;
    if (res?.ok) {
      if (res.reloadedKeys) hydrateStorageMap(res.reloadedKeys);
      setDiskInfo(res.info || null);
      toast({ message: `Đã chuyển thư mục lưu trữ sang: ${res.info?.dataDir}` });
    }
  };

  const handleCreateSnapshot = async () => {
    const res = await window.cozyEnv?.createManualSnapshot?.();
    if (res?.ok) {
      setDiskInfo(res.info);
      toast({ message: '📸 Đã tạo bản sao lưu nhanh vào ổ cứng!' });
    }
  };

  const handleRestoreSnapshot = async (fileName) => {
    const ok = await confirm({
      title: 'Khôi phục mốc sao lưu này?',
      message: `Dữ liệu hiện tại sẽ được sao lưu an toàn trước khi quay về bản "${fileName}".`,
      confirmLabel: 'Khôi phục ngay',
    });
    if (!ok) return;
    const res = await window.cozyEnv?.restoreSnapshot?.(fileName);
    if (res?.ok && res.keys) {
      hydrateStorageMap(res.keys);
      setDiskInfo(res.info);
      toast({ message: `Đã khôi phục dữ liệu từ bản ${fileName}!` });
    }
  };

  const handleLoadSample = async () => {
    const ok = await confirm({
      title: 'Nạp dữ liệu mẫu khám phá?',
      message: 'CozySpace sẽ tạo một vài việc cần làm, môn học IELTS mẫu, ghi chú và khoản thu chi mẫu để bạn trải nghiệm ngay.',
      confirmLabel: 'Nạp dữ liệu mẫu',
    });
    if (!ok) return;
    const currentSettings = settings;
    const sample = {
      ...DEFAULTS,
      ...buildSampleDataset(),
      [STORAGE_KEYS.SETTINGS]: currentSettings,
    };
    hydrateStorageMap(sample, true);
    if (isElectron) {
      for (const [k, v] of Object.entries(sample)) {
        await window.cozyEnv?.writeDbKey?.(k, v);
      }
      await window.cozyEnv?.flushDb?.();
      refreshDiskInfo();
    }
    toast({ message: '🌱 Đã nạp bộ dữ liệu mẫu! Hãy dạo quanh các phân khu nhé.' });
    onClose();
  };

  const handleFactoryReset = async () => {
    const ok = await confirm({
      title: 'Đặt lại toàn bộ dữ liệu?',
      message: 'Mọi ghi chép sẽ được làm trống như lúc mới cài đặt (trên bản Desktop, một bản sao lưu dự phòng vẫn được giữ trong thư mục backups).',
      confirmLabel: 'Đặt lại từ đầu',
      danger: true,
    });
    if (!ok) return;
    if (isElectron) await window.cozyEnv?.createManualSnapshot?.();
    hydrateStorageMap({ ...DEFAULTS }, true);
    if (isElectron) {
      for (const [k, v] of Object.entries(DEFAULTS)) {
        await window.cozyEnv?.writeDbKey?.(k, v);
      }
      await window.cozyEnv?.flushDb?.();
      refreshDiskInfo();
    }
    toast({ message: 'Đã làm mới toàn bộ dữ liệu ứng dụng.' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Settings size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <span>Cài đặt & Quản lý dữ liệu máy tính</span>
        </span>
      }
      width="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Thanh chuyển Tab */}
        <div className="flex gap-1.5 rounded-2xl bg-cozy-blush p-1">
          {[
            { id: 'general', label: 'Cá nhân & Giao diện', icon: Sparkles },
            { id: 'storage', label: 'Ổ cứng & Sao lưu dữ liệu', icon: HardDrive },
          ].map((t) => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition',
                  tab === t.id ? 'bg-cozy-card text-cozy-text shadow-sm' : 'text-cozy-muted hover:text-cozy-text'
                )}
              >
                <TabIcon size={15} strokeWidth={1.75} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === 'general' ? (
          <div className="space-y-5">
            {/* Hồ sơ cá nhân */}
            <div className="rounded-2xl border border-cozy-line bg-cozy-card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cozy-muted">Hồ sơ góc nhỏ của bạn</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-cozy-muted">Tên hiển thị ở Sidebar</label>
                  <Input
                    value={settings.userName || ''}
                    onChange={(e) => patch({ userName: e.target.value })}
                    placeholder="VD: Minh Anh, Cozy Friend..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-cozy-muted">Lời nhắn / Mục tiêu nhỏ</label>
                  <Input
                    value={settings.userTagline || ''}
                    onChange={(e) => patch({ userTagline: e.target.value })}
                    placeholder="VD: Chinh phục học bổng học kỳ này!"
                  />
                </div>
              </div>
            </div>

            {/* Chủ đề màu sắc */}
            <div className="rounded-2xl border border-cozy-line bg-cozy-card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cozy-muted">Chủ đề không gian (4 Themes)</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {THEMES.map((t) => {
                  const active = resolveThemeId(settings.theme) === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => patch({ theme: t.id })}
                      className={cx(
                        'flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition',
                        active ? 'border-cozy-peach bg-cozy-blush shadow-sm' : 'border-cozy-line bg-cozy-bg hover:border-cozy-peach/50'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {t.preview.map((hex, i) => (
                          <span
                            key={i}
                            className="h-5 w-5 rounded-full border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-cozy-text">{t.name}</p>
                        <p className="text-[11px] leading-snug text-cozy-muted">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Đèn bàn vàng ấm */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-cozy-text">
                  <span className="flex items-center gap-1.5">
                    <Sun size={14} className="text-cozy-peach" /> Độ ấm Đèn bàn bảo vệ mắt ban đêm
                  </span>
                  <span className="text-cozy-muted">{settings.warmDimmer || 0}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  step={5}
                  value={settings.warmDimmer || 0}
                  onChange={(e) => patch({ warmDimmer: Number(e.target.value) })}
                  className="mt-1.5 w-full accent-[#F4ACB7]"
                />
              </div>
            </div>

            {/* Trải nghiệm ứng dụng Desktop */}
            <div className="rounded-2xl border border-cozy-line bg-cozy-card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cozy-muted">Hành vi ứng dụng & Âm thanh</p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-cozy-text">Âm hiệu tương tác & Chuông Pomodoro</p>
                  <p className="text-xs text-cozy-muted">Âm báo nhẹ nhàng khi hoàn thành việc hoặc hết phiên tập trung</p>
                </div>
                <Button
                  variant={settings.soundEnabled !== false ? 'secondary' : 'soft'}
                  size="sm"
                  onClick={() => patch({ soundEnabled: settings.soundEnabled === false })}
                >
                  {settings.soundEnabled !== false ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {settings.soundEnabled !== false ? 'Đang bật' : 'Đã tắt'}
                </Button>
              </div>

              {isElectron && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cozy-line pt-3">
                  <div>
                    <p className="text-sm font-bold text-cozy-text">Khi bấm nút [X] đóng cửa sổ</p>
                    <p className="text-xs text-cozy-muted">Giữ nhạc và đồng hồ chạy dưới khay hệ thống Windows (góc phải màn hình)</p>
                  </div>
                  <Select
                    value={settings.closeToTray || 'smart'}
                    onChange={(e) => patch({ closeToTray: e.target.value })}
                    className="py-1.5 text-xs font-semibold"
                  >
                    <option value="smart">Thông minh (Ẩn xuống khay khi đang chạy giờ/nhạc)</option>
                    <option value="always">Luôn thu nhỏ xuống khay hệ thống (như Zalo)</option>
                    <option value="off">Thoát hẳn ứng dụng</option>
                  </Select>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Thông tin thư mục lưu trữ trên ổ cứng */}
            <div className="rounded-2xl border border-cozy-line bg-cozy-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cozy-matcha/25 text-cozy-text">
                    <HardDrive size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cozy-text">
                      {isElectron ? 'Đang lưu trực tiếp trên ổ cứng Laptop' : 'Đang chạy trên trình duyệt Web'}
                    </p>
                    <p className="text-xs text-cozy-muted">
                      {diskInfo
                        ? `Cơ sở dữ liệu: ${diskInfo.dbSizeKB} KB · Tệp hình ảnh/đính kèm: ${diskInfo.mediaCount} tệp (${diskInfo.mediaSizeKB.toLocaleString('vi-VN')} KB)`
                        : 'Mọi thay đổi được tự động lưu bền vững theo thời gian thực'}
                    </p>
                  </div>
                </div>
              </div>

              {isElectron && (
                <>
                  <div className="rounded-xl border border-cozy-line bg-cozy-bg px-3 py-2 font-mono text-xs text-cozy-text break-all">
                    📂 {diskInfo?.dataDir || getDiskDataDir() || 'AppData\\Roaming\\cozyspace\\CozySpaceData'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="soft" size="sm" onClick={() => window.cozyEnv?.openDataFolder?.()}>
                      <FolderOpen size={14} /> Mở thư mục trên máy
                    </Button>
                    <Button variant="soft" size="sm" onClick={handleChangeDataFolder}>
                      <FolderSync size={14} /> Đổi nơi lưu (VD: sang ổ D:\)
                    </Button>
                    <Button variant="soft" size="sm" onClick={handleCreateSnapshot}>
                      <Camera size={14} /> Tạo mốc sao lưu ngay
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Xuất / Nhập tệp sao lưu di động */}
            <div className="rounded-2xl border border-cozy-line bg-cozy-card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cozy-muted">Sao lưu & Di chuyển sang máy tính khác</p>
              <p className="text-xs text-cozy-muted">
                Xuất toàn bộ việc cần làm, tài liệu học, thẻ Flashcard/Quiz, nhật ký, sổ thu chi và <b>toàn bộ ảnh đính kèm</b> thành 1 tệp duy nhất.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button onClick={handleExport}>
                  <Download size={15} /> Xuất gói sao lưu (.json)
                </Button>
                <Button variant="soft" onClick={handleImport}>
                  <Upload size={15} /> Khôi phục từ tệp sao lưu
                </Button>
                <input
                  ref={webImportRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleWebFileImport}
                />
              </div>
            </div>

            {/* Danh sách các bản sao lưu tự động trên ổ cứng */}
            {isElectron && diskInfo?.backups?.length > 0 && (
              <div className="rounded-2xl border border-cozy-line bg-cozy-card p-4 space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-cozy-muted">
                  <History size={14} /> Các bản sao lưu tự động trên máy ({diskInfo.backups.length})
                </p>
                <ul className="cozy-scroll max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {diskInfo.backups.map((b) => (
                    <li
                      key={b.file}
                      className="flex items-center justify-between gap-2 rounded-xl border border-cozy-line bg-cozy-bg px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-cozy-text">{b.file}</p>
                        <p className="text-[11px] text-cozy-muted">
                          {new Date(b.updatedAt).toLocaleString('vi-VN')} · {b.sizeKB} KB
                        </p>
                      </div>
                      <Button variant="soft" size="sm" onClick={() => handleRestoreSnapshot(b.file)}>
                        <RotateCcw size={12} /> Khôi phục
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dữ liệu mẫu & Đặt lại */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cozy-line bg-cozy-blush/70 p-3.5">
              <Button variant="butter" size="sm" onClick={handleLoadSample}>
                <Sparkles size={14} /> Nạp bộ dữ liệu mẫu dùng thử
              </Button>
              <div className="flex gap-2">
                {isElectron && (
                  <Button variant="ghost" size="sm" onClick={() => window.cozyEnv?.quitApp?.()}>
                    <Power size={14} /> Thoát hẳn ứng dụng
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={handleFactoryReset}>
                  <Trash2 size={14} /> Đặt lại dữ liệu gốc
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

