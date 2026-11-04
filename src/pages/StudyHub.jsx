// (2) Khu vực Học tập + Gemini (Study Hub) — Sổ tay môn học, Đọc Markdown, Flashcard 3D, Quiz & Gemini Webview bền bỉ
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  Pencil,
  Check,
  Layers,
  HelpCircle,
  Eye,
  Edit3,
  Download,
  Timer,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { Card, Button, Input, PageHeader, IconButton, Modal, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { usePomodoroState } from '../context/PomodoroContext.jsx';
import { SubjectCoverSvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, formatRelativeTime, downloadTextFile } from '../lib/utils.js';
import {
  SUBJECT_COLORS,
  parseGeminiStudyPayload,
  dedupeMergeStudyData,
  MarkdownPreview,
} from './study/studyHelpers.jsx';
import FlashcardDeck from './study/FlashcardDeck.jsx';
import QuizArena from './study/QuizArena.jsx';
import GeminiBridgePane from './study/GeminiBridgePane.jsx';

export { SUBJECT_COLORS, parseGeminiStudyPayload };

export default function StudyHub() {
  const [subjects, setSubjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const [materials, setMaterials] = useCozyStorage(STORAGE_KEYS.STUDY_MATERIALS);
  const [studySets, setStudySets] = useCozyStorage(STORAGE_KEYS.STUDY_SETS);
  const { toast, confirm } = useToast();
  const { startFocusOn } = usePomodoroState();

  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [activeTab, setActiveTab] = useState('materials'); // materials | flashcards | quizzes
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [materialViewMode, setMaterialViewMode] = useState('preview'); // 'edit' | 'preview'
  const [geminiExpanded, setGeminiExpanded] = useState(false);

  // Modal tạo/sửa môn học
  const [subjectModal, setSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(SUBJECT_COLORS[0].bg);

  const fileInputRef = useRef(null);

  // Nhận yêu cầu mở thẳng môn học / tài liệu từ Bảng lệnh Ctrl+K hoặc Ghi chú nhanh
  useEffect(() => {
    const applyTarget = (detail) => {
      if (!detail?.subjectId) return;
      setActiveSubjectId(detail.subjectId);
      setActiveTab('materials');
      if (detail.materialId) {
        setSelectedMaterialId(detail.materialId);
      }
    };

    if (window.__cozyPendingSubject) {
      applyTarget(window.__cozyPendingSubject);
      window.__cozyPendingSubject = null;
    }

    const onOpenSubject = (e) => applyTarget(e.detail);
    window.addEventListener('cozy-open-subject', onOpenSubject);
    return () => window.removeEventListener('cozy-open-subject', onOpenSubject);
  }, []);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId) || null,
    [subjects, activeSubjectId]
  );

  // Cố định thứ tự tab bài học theo thời điểm tạo (createdAt) để gõ nội dung không làm nhảy tab!
  const subjectMaterials = useMemo(
    () =>
      materials
        .map((m, idx) => ({ ...m, _order: m.createdAt || idx }))
        .filter((m) => m.subjectId === activeSubjectId)
        .sort((a, b) => a._order - b._order),
    [materials, activeSubjectId]
  );

  useEffect(() => {
    if (!activeSubjectId) return;
    if (!subjectMaterials.some((m) => m.id === selectedMaterialId)) {
      const firstMat = subjectMaterials[0] || null;
      setSelectedMaterialId(firstMat?.id || null);
      setMaterialViewMode(firstMat?.content?.trim() ? 'preview' : 'edit');
    }
  }, [activeSubjectId, subjectMaterials, selectedMaterialId]);

  const currentMaterial = useMemo(
    () => subjectMaterials.find((m) => m.id === selectedMaterialId) || null,
    [subjectMaterials, selectedMaterialId]
  );

  const currentStudySet = useMemo(
    () =>
      studySets.find((s) => s.subjectId === activeSubjectId) || {
        id: `set_${activeSubjectId}`,
        subjectId: activeSubjectId,
        flashcards: [],
        quizzes: [],
      },
    [studySets, activeSubjectId]
  );

  const updateStudySet = (updater) => {
    if (!activeSubjectId) return;
    setStudySets((prev) => {
      const exists = prev.find((s) => s.subjectId === activeSubjectId);
      if (exists) {
        return prev.map((s) => (s.subjectId === activeSubjectId ? updater(s) : s));
      }
      const created = updater({
        id: uid(),
        subjectId: activeSubjectId,
        flashcards: [],
        quizzes: [],
      });
      return [...prev, created];
    });
  };

  // Thêm/sửa môn học
  const openCreateSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectColor(SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length].bg);
    setSubjectModal(true);
  };

  const openEditSubject = (subj, e) => {
    e?.stopPropagation?.();
    setEditingSubject(subj);
    setSubjectName(subj.name);
    setSubjectColor(subj.color || SUBJECT_COLORS[0].bg);
    setSubjectModal(true);
  };

  const saveSubject = () => {
    const name = subjectName.trim();
    if (!name) return;
    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === editingSubject.id ? { ...s, name, color: subjectColor } : s))
      );
      toast({ message: `✏️ Đã cập nhật môn "${name}"` });
    } else {
      const id = uid();
      const now = Date.now();
      const newSubj = {
        id,
        name,
        color: subjectColor,
        coverSlotId: `subject_cover_${id}`,
        createdAt: now,
      };
      setSubjects((prev) => [...prev, newSubj]);
      const matId = uid();
      setMaterials((prev) => [
        ...prev,
        {
          id: matId,
          subjectId: id,
          title: `Ghi chú bài 1 - ${name}`,
          content: '',
          type: 'note',
          createdAt: now,
          updatedAt: now,
        },
      ]);
      setStudySets((prev) => [
        ...prev,
        { id: uid(), subjectId: id, flashcards: [], quizzes: [] },
      ]);
      toast({ message: `📚 Đã tạo sổ tay môn "${name}"!` });
    }
    setSubjectModal(false);
  };

  const deleteSubject = async (subj, e) => {
    e?.stopPropagation?.();
    const ok = await confirm({
      title: `Xóa môn "${subj.name}"?`,
      message: `Toàn bộ tài liệu, thẻ Flashcard và câu hỏi Quiz thuộc môn "${subj.name}" sẽ bị xóa. Bạn chắc chắn chứ?`,
      confirmLabel: 'Xóa môn học',
      danger: true,
    });
    if (!ok) return;

    const backupSubj = subj;
    const backupMats = materials.filter((m) => m.subjectId === subj.id);
    const backupSets = studySets.filter((s) => s.subjectId === subj.id);

    setSubjects((prev) => prev.filter((s) => s.id !== subj.id));
    setMaterials((prev) => prev.filter((m) => m.subjectId !== subj.id));
    setStudySets((prev) => prev.filter((s) => s.subjectId !== subj.id));
    if (activeSubjectId === subj.id) setActiveSubjectId(null);

    toast({
      message: `Đã xóa môn "${subj.name}"`,
      onUndo: () => {
        setSubjects((prev) => [...prev, backupSubj]);
        setMaterials((prev) => [...prev, ...backupMats]);
        setStudySets((prev) => [...prev, ...backupSets]);
      },
    });
  };

  // Quản lý tài liệu trong môn học
  const createNoteMaterial = () => {
    if (!activeSubjectId) return;
    const id = uid();
    const now = Date.now();
    const next = {
      id,
      subjectId: activeSubjectId,
      title: `Bài ghi chú #${subjectMaterials.length + 1}`,
      content: '',
      type: 'note',
      createdAt: now,
      updatedAt: now,
    };
    setMaterials((prev) => [...prev, next]);
    setSelectedMaterialId(id);
    setMaterialViewMode('edit');
    setActiveTab('materials');
  };

  const handleUploadTxtMd = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !activeSubjectId) return;

    const added = [];
    let offset = 0;
    for (const file of files) {
      const text = await file.text();
      const now = Date.now() + offset++;
      added.push({
        id: uid(),
        subjectId: activeSubjectId,
        title: file.name.replace(/\.(txt|md|markdown)$/i, '') || file.name,
        content: text,
        type: 'file',
        createdAt: now,
        updatedAt: now,
      });
    }
    setMaterials((prev) => [...prev, ...added]);
    setSelectedMaterialId(added[0].id);
    setActiveTab('materials');
    toast({ message: `📄 Đã tải lên ${added.length} tài liệu!` });
  };

  const updateCurrentMaterial = (patch) => {
    if (!currentMaterial) return;
    setMaterials((prev) =>
      prev.map((m) => (m.id === currentMaterial.id ? { ...m, ...patch, updatedAt: Date.now() } : m))
    );
  };

  const deleteMaterial = (mat) => {
    const idx = materials.findIndex((m) => m.id === mat.id);
    setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
    toast({
      message: `Đã xóa tài liệu "${mat.title}"`,
      onUndo: () => {
        setMaterials((prev) => {
          if (prev.some((m) => m.id === mat.id)) return prev;
          const next = [...prev];
          next.splice(Math.max(0, idx), 0, mat);
          return next;
        });
        setSelectedMaterialId(mat.id);
      },
    });
  };

  const exportMaterialMarkdown = () => {
    if (!currentMaterial) return;
    const safeName =
      currentMaterial.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Bai-ghi-chu';
    const content = `# ${currentMaterial.title}\n\n${currentMaterial.content || ''}`;
    downloadTextFile(`${safeName}.md`, content);
    toast({ message: `⬇️ Đã tải xuống tệp "${safeName}.md"!` });
  };

  const handleStartSubjectFocus = () => {
    if (!activeSubject) return;
    startFocusOn({
      type: 'subject',
      id: activeSubject.id,
      title: `Ôn môn: ${activeSubject.name}`,
    });
    toast({
      message: `🍅 Đã bắt đầu đếm Pomodoro cho môn "${activeSubject.name}"!`,
      undoLabel: 'Mở Đồng hồ',
      onUndo: () => window.dispatchEvent(new CustomEvent('cozy-navigate', { detail: { zone: 'focus' } })),
    });
  };

  // Nhận dữ liệu JSON từ Gemini Bridge (có khử trùng lặp thông minh)
  const handleImportFromGemini = ({ flashcards, quizzes }) => {
    const merged = dedupeMergeStudyData(
      currentStudySet.flashcards || [],
      flashcards,
      currentStudySet.quizzes || [],
      quizzes
    );

    updateStudySet((set) => ({
      ...set,
      flashcards: merged.flashcards,
      quizzes: merged.quizzes,
    }));

    if (merged.addedCardsCount > 0) setActiveTab('flashcards');
    else if (merged.addedQuizzesCount > 0) setActiveTab('quizzes');

    const parts = [];
    if (merged.addedCardsCount) parts.push(`${merged.addedCardsCount} thẻ Flashcard`);
    if (merged.addedQuizzesCount) parts.push(`${merged.addedQuizzesCount} câu Quiz`);
    const skipNote = merged.skippedCount ? ` (bỏ qua ${merged.skippedCount} mục trùng)` : '';

    toast({
      message: parts.length
        ? `🎉 Đã nhập thêm ${parts.join(' & ')}${skipNote}!`
        : `Tất cả câu hỏi/thẻ đều đã có sẵn trong bộ ôn tập${skipNote}.`,
    });
  };

  // Lưu câu trả lời văn bản của Gemini thành một Bài ghi chú mới
  const handleSaveGeminiSummaryAsNote = (summaryText) => {
    if (!activeSubjectId || !summaryText?.trim()) return;
    const id = uid();
    const now = Date.now();
    const baseTitle = currentMaterial ? `Tóm tắt: ${currentMaterial.title}` : 'Tóm tắt từ Gemini';
    const newMat = {
      id,
      subjectId: activeSubjectId,
      title: baseTitle.slice(0, 70),
      content: summaryText.trim(),
      type: 'note',
      createdAt: now,
      updatedAt: now,
    };
    setMaterials((prev) => [...prev, newMat]);
    setSelectedMaterialId(id);
    setMaterialViewMode('preview');
    setActiveTab('materials');
  };

  return (
    <div className="relative">
      {/* ========================================================== */}
      {/* CHẾ ĐỘ 1: KỆ SỔ TAY MÔN HỌC (khi chưa mở môn nào)          */}
      {/* ========================================================== */}
      {!activeSubject && (
        <div>
          <PageHeader
            icon={BookOpen}
            title="Khu vực Học tập + Gemini"
            subtitle="Mỗi môn học là một cuốn sổ nhỏ — đọc bài Markdown, lật Flashcard 3D và luyện Quiz cùng Gemini"
            right={
              <Button onClick={openCreateSubject}>
                <Plus size={16} /> Thêm môn học
              </Button>
            }
          />

          {subjects.length === 0 ? (
            <Card className="p-10">
              <EmptyState
                title="Kệ sách học tập đang trống"
                hint="Tạo cuốn sổ tay môn học đầu tiên để bắt đầu ghi chép và tạo Flashcard / Quiz tự động với Gemini nhé!"
                size="w-44"
              >
                <Button onClick={openCreateSubject}>
                  <Plus size={16} /> Tạo môn học đầu tiên
                </Button>
              </EmptyState>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subj) => {
                const matCount = materials.filter((m) => m.subjectId === subj.id).length;
                const set = studySets.find((s) => s.subjectId === subj.id);
                const fcCount = set?.flashcards?.length || 0;
                const qzCount = set?.quizzes?.length || 0;
                const perSubjSlotId =
                  subj.coverSlotId && subj.coverSlotId !== 'subject_default_cover'
                    ? subj.coverSlotId
                    : `subject_cover_${subj.id}`;

                return (
                  <Card
                    key={subj.id}
                    onClick={() => {
                      setActiveSubjectId(subj.id);
                      setActiveTab('materials');
                    }}
                    className="group flex cursor-pointer flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[3/2] w-full overflow-hidden border-b border-cozy-line">
                      <ImageSlot
                        slotId={perSubjSlotId}
                        fallbackSlotId="subject_default_cover"
                        labelOverride={`Ảnh bìa môn: ${subj.name}`}
                        defaultSvg={<SubjectCoverSvg />}
                        className="h-full w-full"
                      />
                      <span
                        className="pointer-events-none absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-[#2A2120] shadow-sm backdrop-blur"
                        style={{ backgroundColor: subj.color || '#F4ACB7' }}
                      >
                        {subj.name}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-cozy-text">{subj.name}</h3>
                          <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                            <IconButton title="Đổi tên / màu" onClick={(e) => openEditSubject(subj, e)}>
                              <Pencil size={14} />
                            </IconButton>
                            <IconButton title="Xóa môn học" onClick={(e) => deleteSubject(subj, e)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-cozy-muted">
                          <span className="rounded-full bg-cozy-blush px-2.5 py-0.5">
                            {matCount} tài liệu
                          </span>
                          <span className="rounded-full bg-cozy-butter/70 px-2.5 py-0.5 text-[#2A2120]">
                            {fcCount} flashcard
                          </span>
                          <span className="rounded-full bg-cozy-matcha/25 px-2.5 py-0.5">
                            {qzCount} câu quiz
                          </span>
                          {set?.bestQuizScore != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cozy-lavender px-2 py-0.5 text-[#2A2120]">
                              <Trophy size={10} /> {set.bestQuizScore}/10
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-cozy-line pt-3 text-xs font-bold text-cozy-accent">
                        <span>Mở phòng học & Gemini</span>
                        <span>→</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Modal
            open={subjectModal}
            onClose={() => setSubjectModal(false)}
            title={
              <span className="inline-flex items-center gap-2">
                {editingSubject ? (
                  <Pencil size={17} strokeWidth={1.75} className="text-cozy-accent" />
                ) : (
                  <BookOpen size={17} strokeWidth={1.75} className="text-cozy-accent" />
                )}
                <span>{editingSubject ? 'Chỉnh sửa môn học' : 'Tạo sổ tay môn học mới'}</span>
              </span>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-cozy-muted">Tên môn học</label>
                <Input
                  autoFocus
                  placeholder="VD: Tiếng Anh IELTS, Giải tích 1, Lịch sử..."
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveSubject()}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-cozy-muted">Màu nhãn môn học</label>
                <div className="flex gap-2">
                  {SUBJECT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSubjectColor(c.bg)}
                      className={cx(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-xs font-bold text-[#2A2120] transition',
                        subjectColor === c.bg
                          ? 'border-[#2A2120] shadow-sm'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      )}
                      style={{ backgroundColor: c.bg }}
                    >
                      {subjectColor === c.bg && <Check size={13} />} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setSubjectModal(false)}>
                  Hủy
                </Button>
                <Button onClick={saveSubject} disabled={!subjectName.trim()}>
                  {editingSubject ? 'Lưu thay đổi' : 'Tạo môn học'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ========================================================== */}
      {/* CHẾ ĐỘ 2: PHÒNG HỌC 2 CỘT (Giữ GeminiBridgePane luôn sống) */}
      {/* ========================================================== */}
      <div
        className={
          activeSubject
            ? 'space-y-4'
            : 'pointer-events-none fixed -left-[9999px] top-0 h-[760px] w-[1100px] overflow-hidden opacity-0'
        }
      >
        {activeSubject && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="soft" size="sm" onClick={() => setActiveSubjectId(null)}>
                <ArrowLeft size={15} /> Kệ môn học
              </Button>
              <span
                className="h-4 w-4 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: activeSubject.color || '#F4ACB7' }}
              />
              <h1 className="text-xl font-bold text-cozy-text">{activeSubject.name}</h1>
              <button
                type="button"
                onClick={handleStartSubjectFocus}
                title="Bắt đầu phiên đếm ngược Pomodoro cho môn học này"
                className="inline-flex items-center gap-1 rounded-full border border-cozy-line bg-cozy-blush px-2.5 py-1 text-xs font-bold text-cozy-text transition hover:border-cozy-peach"
              >
                <Timer size={13} className="text-cozy-peach" /> Tập trung môn này
              </button>
            </div>

            {/* 3 Tab con của Cột trái */}
            <div className="flex gap-1.5 rounded-2xl border border-cozy-line bg-cozy-card p-1 shadow-sm">
              {[
                {
                  id: 'materials',
                  label: 'Tài liệu môn học',
                  icon: FileText,
                  count: subjectMaterials.length,
                },
                {
                  id: 'flashcards',
                  label: 'Flashcard',
                  icon: Layers,
                  count: currentStudySet.flashcards?.length || 0,
                },
                {
                  id: 'quizzes',
                  label: 'Trắc nghiệm Quiz',
                  icon: HelpCircle,
                  count: currentStudySet.quizzes?.length || 0,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cx(
                    'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                    activeTab === t.id
                      ? 'bg-cozy-peach text-[#2A2120] shadow-sm'
                      : 'text-cozy-muted hover:text-cozy-text'
                  )}
                >
                  <t.icon size={14} /> {t.label}
                  <span
                    className={cx(
                      'rounded-full px-1.5 py-0.2 text-[10px]',
                      activeTab === t.id ? 'bg-white/50 text-[#2A2120]' : 'bg-cozy-blush text-cozy-muted'
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5 lg:h-[calc(100vh-132px)] lg:min-h-[540px] lg:flex-row lg:items-stretch">
          {/* CỘT TRÁI (55% mặc định, thu gọn 44% khi mở rộng Gemini) */}
          {activeSubject && (
            <div
              className={cx(
                'flex w-full flex-col transition-all duration-300 lg:h-full',
                geminiExpanded ? 'lg:w-[44%]' : 'lg:w-[55%]'
              )}
            >
              <Card className="flex h-full flex-col overflow-hidden p-5">
                {activeTab === 'materials' && (
                  <div className="flex h-full flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {subjectMaterials.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMaterialId(m.id);
                              if (m.content?.trim()) setMaterialViewMode('preview');
                            }}
                            style={{
                              border: '1px solid var(--border-subtle)',
                              backgroundColor:
                                m.id === selectedMaterialId
                                  ? 'color-mix(in srgb, var(--accent) 18%, var(--bg-card))'
                                  : 'transparent',
                            }}
                            className={cx(
                              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                              m.id === selectedMaterialId
                                ? 'font-bold text-cozy-text'
                                : 'text-[var(--text-muted)] hover:text-cozy-text'
                            )}
                          >
                            <FileText size={13} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
                            <span>{m.title}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="soft" size="sm" onClick={createNoteMaterial}>
                          <Plus size={14} /> Soạn bài mới
                        </Button>
                        <Button variant="soft" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload size={14} /> Tải .txt/.md
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md,.markdown,text/plain,text/markdown"
                          multiple
                          className="hidden"
                          onChange={handleUploadTxtMd}
                        />
                      </div>
                    </div>

                    {!currentMaterial ? (
                      <EmptyState
                        title="Chưa có tài liệu nào trong môn này"
                        hint="Bấm [Soạn bài mới] hoặc [Tải .txt/.md] để đưa nội dung bài học vào nhé!"
                        size="w-36"
                      />
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            spellCheck={false}
                            value={currentMaterial.title}
                            onChange={(e) => updateCurrentMaterial({ title: e.target.value })}
                            placeholder="Tiêu đề tài liệu / chương học..."
                            className="min-w-[180px] flex-1 font-bold"
                          />

                          {/* Chuyển đổi Soạn thảo / Đọc Markdown */}
                          <div
                            className="flex rounded-xl p-0.5"
                            style={{ border: '1px solid var(--border-subtle)' }}
                          >
                            <button
                              type="button"
                              onClick={() => setMaterialViewMode('edit')}
                              className={cx(
                                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                                materialViewMode === 'edit'
                                  ? 'bg-cozy-card text-cozy-text shadow-sm'
                                  : 'text-[var(--text-muted)] hover:text-cozy-text'
                              )}
                            >
                              <Edit3 size={12} /> Soạn
                            </button>
                            <button
                              type="button"
                              onClick={() => setMaterialViewMode('preview')}
                              className={cx(
                                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                                materialViewMode === 'preview'
                                  ? 'bg-cozy-card text-cozy-text shadow-sm'
                                  : 'text-[var(--text-muted)] hover:text-cozy-text'
                              )}
                            >
                              <Eye size={12} /> Đọc bài
                            </button>
                          </div>

                          <IconButton title="Xuất tệp Markdown (.md)" onClick={exportMaterialMarkdown}>
                            <Download size={15} />
                          </IconButton>

                          <IconButton
                            title="Xóa tài liệu này"
                            onClick={() => deleteMaterial(currentMaterial)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>

                        {materialViewMode === 'preview' ? (
                          <div
                            className="cozy-scroll min-h-[260px] flex-1 overflow-y-auto rounded-2xl p-5"
                            style={{
                              backgroundColor: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <MarkdownPreview content={currentMaterial.content} />
                          </div>
                        ) : (
                          <textarea
                            spellCheck={false}
                            value={currentMaterial.content}
                            onChange={(e) => updateCurrentMaterial({ content: e.target.value })}
                            placeholder="Nhập hoặc dán nội dung bài giảng, công thức, từ vựng (hỗ trợ Markdown # Tiêu đề, **in đậm**, - danh sách)...&#10;Mẹo: Bấm nút [Đọc bài] để xem trình bày đẹp mắt, hoặc gửi sang Gemini bên phải để tạo Flashcard & Quiz!"
                            style={{
                              backgroundColor: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                            }}
                            className="cozy-scroll min-h-[260px] flex-1 resize-none rounded-2xl p-4 text-sm leading-relaxed text-cozy-text outline-none"
                          />
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cozy-muted">
                          <span>
                            {currentMaterial.content.length.toLocaleString('vi-VN')} ký tự · Cập nhật{' '}
                            {formatRelativeTime(currentMaterial.updatedAt)}
                          </span>
                          <span className="font-semibold text-cozy-accent">
                            Dùng thanh Gemini bên phải để Tóm tắt, tạo Flashcard & Quiz
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'flashcards' && (
                  <div className="cozy-scroll flex-1 overflow-y-auto pr-1">
                    <FlashcardDeck
                      flashcards={currentStudySet.flashcards || []}
                      onChange={(nextCards) =>
                        updateStudySet((set) => ({ ...set, flashcards: nextCards }))
                      }
                    />
                  </div>
                )}

                {activeTab === 'quizzes' && (
                  <div className="cozy-scroll flex-1 overflow-y-auto pr-1">
                    <QuizArena
                      quizzes={currentStudySet.quizzes || []}
                      bestScore={currentStudySet.bestQuizScore ?? null}
                      onChange={(nextQuizzes) =>
                        updateStudySet((set) => ({ ...set, quizzes: nextQuizzes }))
                      }
                      onBestScore={(score) =>
                        updateStudySet((set) => ({
                          ...set,
                          bestQuizScore: score,
                          lastQuizAt: Date.now(),
                        }))
                      }
                    />
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* CỘT PHẢI (45% mặc định, 56% khi mở rộng): GEMINI WEBVIEW + SMART BRIDGE */}
          <div
            className={cx(
              'flex w-full flex-col transition-all duration-300 lg:h-full',
              geminiExpanded ? 'lg:w-[56%]' : 'lg:w-[45%]'
            )}
          >
            <GeminiBridgePane
              material={currentMaterial}
              onImportStudyData={handleImportFromGemini}
              onSaveSummaryAsNote={handleSaveGeminiSummaryAsNote}
              isExpanded={geminiExpanded}
              onToggleExpand={() => setGeminiExpanded((v) => !v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
