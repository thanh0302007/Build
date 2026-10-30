// (6) Sổ thu chi - lưu vào `cozy_expenses`, dùng `expense_piggy` & biểu đồ Donut SVG
import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, Button, Input, Select, PageHeader, IconButton, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ExpensePiggySvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, todayISO, formatShortDate } from '../lib/utils.js';

// 5 danh mục chuẩn theo PROJECT_RULES.md mục II.9
export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Ăn uống', emoji: '🍜', color: '#F4ACB7', badge: 'bg-cozy-peach/25' },
  { id: 'study', label: 'Học tập', emoji: '📚', color: '#A3C9A8', badge: 'bg-cozy-matcha/30' },
  { id: 'shopping', label: 'Mua sắm', emoji: '🛍️', color: '#E2D4F0', badge: 'bg-cozy-lavender' },
  { id: 'entertainment', label: 'Giải trí', emoji: '🎮', color: '#FFF3B0', badge: 'bg-cozy-butter' },
  { id: 'other', label: 'Khác', emoji: '✨', color: '#E9DCCB', badge: 'bg-[#F0EAE1]' },
];

const CAT_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c]));

const formatVND = (n) => `${(Number(n) || 0).toLocaleString('vi-VN')}₫`;

// Biểu đồ Donut SVG tương tác theo 5 danh mục chi tiêu
function ExpenseDonutChart({ breakdown, totalExpense, hoveredCat, onHoverCat }) {
  const r = 74;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() => {
    if (!totalExpense) return [];
    let acc = 0;
    return breakdown
      .filter((item) => item.amount > 0)
      .map((item) => {
        const fraction = item.amount / totalExpense;
        const length = fraction * circumference;
        const offset = -acc;
        acc += length;
        return { ...item, fraction, length, offset };
      });
  }, [breakdown, totalExpense, circumference]);

  const activeItem = hoveredCat ? segments.find((s) => s.id === hoveredCat) : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      {/* Vòng Donut */}
      <div className="relative flex h-52 w-52 shrink-0 items-center justify-center">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#F0EAE1" strokeWidth="24" />
          {segments.map((seg) => {
            const isHovered = hoveredCat === seg.id;
            return (
              <circle
                key={seg.id}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? 28 : 24}
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={seg.offset}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => onHoverCat(seg.id)}
                onMouseLeave={() => onHoverCat(null)}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {activeItem ? (
            <>
              <span className="text-lg">{activeItem.emoji}</span>
              <span className="text-xs font-bold text-cozy-text">{activeItem.label}</span>
              <span className="text-sm font-bold text-cozy-text">{formatVND(activeItem.amount)}</span>
              <span className="text-[11px] font-semibold text-cozy-muted">
                {Math.round(activeItem.fraction * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-semibold text-cozy-muted">Tổng chi tháng</span>
              <span className="mt-0.5 text-base font-bold text-cozy-text">{formatVND(totalExpense)}</span>
              <span className="mt-0.5 text-[10px] text-cozy-muted">
                {segments.length ? 'Rê chuột xem chi tiết' : 'Chưa phát sinh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Chú giải 5 danh mục */}
      <div className="w-full flex-1 space-y-2">
        {breakdown.map((item) => {
          const pct = totalExpense ? Math.round((item.amount / totalExpense) * 100) : 0;
          return (
            <div
              key={item.id}
              onMouseEnter={() => onHoverCat(item.id)}
              onMouseLeave={() => onHoverCat(null)}
              className={cx(
                'flex items-center justify-between rounded-2xl border px-3 py-2 text-xs transition',
                hoveredCat === item.id
                  ? 'border-cozy-peach bg-cozy-blush shadow-sm'
                  : 'border-cozy-line bg-white'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-cozy-text/20"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-bold text-cozy-text">
                  {item.emoji} {item.label}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-cozy-text">{formatVND(item.amount)}</span>
                <span className="ml-2 inline-block w-9 text-right text-[11px] font-semibold text-cozy-muted">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useCozyStorage(STORAGE_KEYS.EXPENSES);
  const today = todayISO();
  const [monthCursor, setMonthCursor] = useState(() => today.slice(0, 7)); // YYYY-MM

  // Chỉnh ngân sách hàng tháng
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');

  // Form thêm giao dịch
  const [txType, setTxType] = useState('expense'); // expense | income
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState('all'); // all | expense | income
  const [catFilter, setCatFilter] = useState('all');
  const [hoveredCat, setHoveredCat] = useState(null);

  const transactions = useMemo(
    () => (Array.isArray(expenses?.transactions) ? expenses.transactions : []),
    [expenses]
  );
  const monthlyBudget = Number(expenses?.monthlyBudget) || 0;

  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((t) => (t.date || '').startsWith(monthCursor))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id).localeCompare(String(a.id))),
    [transactions, monthCursor]
  );

  const { totalIncome, totalExpense, breakdown } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const byCat = { food: 0, study: 0, shopping: 0, entertainment: 0, other: 0 };
    monthTransactions.forEach((t) => {
      const val = Number(t.amount) || 0;
      if (t.type === 'income') inc += val;
      else {
        exp += val;
        const key = byCat[t.category] !== undefined ? t.category : 'other';
        byCat[key] += val;
      }
    });
    const list = EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: byCat[c.id] || 0 }));
    return { totalIncome: inc, totalExpense: exp, breakdown: list };
  }, [monthTransactions]);

  const visibleTransactions = useMemo(
    () =>
      monthTransactions.filter(
        (t) =>
          (typeFilter === 'all' || t.type === typeFilter) &&
          (catFilter === 'all' || t.category === catFilter)
      ),
    [monthTransactions, typeFilter, catFilter]
  );

  const shiftMonth = (delta) => {
    const [y, m] = monthCursor.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setMonthCursor(next);
  };

  const saveBudget = () => {
    const val = Math.max(0, Number(String(budgetDraft).replace(/[^\d]/g, '')) || 0);
    setExpenses((prev) => ({ ...prev, monthlyBudget: val }));
    setEditingBudget(false);
  };

  const addTransaction = () => {
    const cleanAmount = Math.round(Number(String(amount).replace(/[^\d.]/g, '')) || 0);
    if (cleanAmount <= 0) return;
    const item = {
      id: uid(),
      amount: cleanAmount,
      type: txType,
      category,
      note: note.trim() || (txType === 'income' ? 'Khoản thu' : CAT_MAP[category]?.label || 'Chi tiêu'),
      date: date || today,
    };
    setExpenses((prev) => ({
      ...prev,
      transactions: [item, ...(prev.transactions || [])],
    }));
    setAmount('');
    setNote('');
    if (item.date.slice(0, 7) !== monthCursor) {
      setMonthCursor(item.date.slice(0, 7));
    }
  };

  const deleteTransaction = (id) => {
    setExpenses((prev) => ({
      ...prev,
      transactions: (prev.transactions || []).filter((t) => t.id !== id),
    }));
  };

  const budgetUsedPct = monthlyBudget ? Math.min(100, Math.round((totalExpense / monthlyBudget) * 100)) : 0;
  const remainingBudget = monthlyBudget - totalExpense;
  const [yearNum, monthNum] = monthCursor.split('-').map(Number);

  return (
    <div>
      <PageHeader
        emoji="🐷"
        title="Sổ thu chi"
        subtitle="Quản lý ngân sách thông minh và theo dõi biểu đồ chi tiêu từng tháng"
        right={
          <div className="flex items-center gap-1 rounded-2xl border border-cozy-line bg-white px-2 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-xl p-1.5 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text"
              title="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[110px] text-center text-sm font-bold text-cozy-text">
              Tháng {monthNum}/{yearNum}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-xl p-1.5 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text"
              title="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      {/* Hàng thẻ tổng quan + Ống heo tiết kiệm (`expense_piggy`) */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card Ống heo + Ngân sách tháng */}
        <Card tone="blush" className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center lg:col-span-5">
          <ImageSlot
            slotId="expense_piggy"
            defaultSvg={<ExpensePiggySvg />}
            fit="contain"
            compact
            className="mx-auto aspect-[10/9] w-32 shrink-0 rounded-2xl sm:mx-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-cozy-muted">🎯 Ngân sách tháng {monthNum}</span>
              {!editingBudget && (
                <button
                  type="button"
                  onClick={() => {
                    setBudgetDraft(String(monthlyBudget || ''));
                    setEditingBudget(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-cozy-peach hover:underline"
                >
                  <Pencil size={12} /> Đặt ngân sách
                </button>
              )}
            </div>

            {editingBudget ? (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  autoFocus
                  type="number"
                  min={0}
                  step={50000}
                  placeholder="VD: 5000000"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
                  className="py-1.5 text-sm"
                />
                <Button size="sm" onClick={saveBudget}>
                  <Check size={14} />
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-2xl font-bold text-cozy-text">
                {monthlyBudget ? formatVND(monthlyBudget) : 'Chưa đặt hạn mức'}
              </p>
            )}

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-cozy-line">
              <div
                className={cx(
                  'h-full rounded-full transition-all',
                  budgetUsedPct >= 90 ? 'bg-cozy-peach' : 'bg-cozy-matcha'
                )}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>

            <p className="mt-1.5 text-xs text-cozy-muted">
              {monthlyBudget ? (
                remainingBudget >= 0 ? (
                  <>
                    Còn lại <b className="text-cozy-text">{formatVND(remainingBudget)}</b> ({100 - budgetUsedPct}%)
                  </>
                ) : (
                  <span className="font-bold text-cozy-peach">
                    Vượt ngân sách {formatVND(Math.abs(remainingBudget))}
                  </span>
                )
              ) : (
                'Bấm "Đặt ngân sách" để ống heo nhắc nhở chi tiêu nhé!'
              )}
            </p>
          </div>
        </Card>

        {/* 3 thẻ Thu - Chi - Số dư */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
          <Card className="flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cozy-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cozy-matcha/30 text-cozy-text">
                <TrendingUp size={16} />
              </span>
              Tổng thu tháng {monthNum}
            </div>
            <p className="mt-3 text-xl font-bold text-cozy-text">+{formatVND(totalIncome)}</p>
          </Card>

          <Card className="flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cozy-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cozy-peach/25 text-cozy-text">
                <TrendingDown size={16} />
              </span>
              Tổng chi tháng {monthNum}
            </div>
            <p className="mt-3 text-xl font-bold text-cozy-text">-{formatVND(totalExpense)}</p>
          </Card>

          <Card className="flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cozy-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cozy-butter text-cozy-text">
                <Wallet size={16} />
              </span>
              Chênh lệch thu - chi
            </div>
            <p className="mt-3 text-xl font-bold text-cozy-text">
              {totalIncome - totalExpense >= 0 ? '+' : ''}
              {formatVND(totalIncome - totalExpense)}
            </p>
          </Card>
        </div>
      </div>

      {/* Hàng chính: Biểu đồ Donut + Form thêm giao dịch & Lịch sử */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* CỘT TRÁI: BIỂU ĐỒ DONUT + FORM GHI GIAO DỊCH */}
        <div className="space-y-6 xl:col-span-3">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-cozy-text">
                🍩 Cơ cấu chi tiêu tháng {monthNum}/{yearNum}
              </h2>
              <span className="text-xs font-semibold text-cozy-muted">5 nhóm danh mục chuẩn</span>
            </div>
            <ExpenseDonutChart
              breakdown={breakdown}
              totalExpense={totalExpense}
              hoveredCat={hoveredCat}
              onHoverCat={setHoveredCat}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-cozy-text">
              <PiggyBank size={18} className="text-cozy-peach" /> Ghi khoản thu / chi mới
            </h2>

            <div className="mb-3 flex gap-2 rounded-2xl bg-cozy-blush p-1">
              {[
                { id: 'expense', label: '💸 Khoản chi', activeClass: 'bg-cozy-peach text-white' },
                { id: 'income', label: '🌱 Khoản thu', activeClass: 'bg-cozy-matcha text-white' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxType(t.id)}
                  className={cx(
                    'flex-1 rounded-xl py-2 text-xs font-bold transition',
                    txType === t.id ? `${t.activeClass} shadow-sm` : 'text-cozy-muted hover:text-cozy-text'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-cozy-muted">Số tiền (₫)</label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="VD: 45000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTransaction()}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-cozy-muted">Danh mục</label>
                <Select className="w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-cozy-muted">Ngày</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {/* Mức tiền gợi ý nhanh */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[20000, 35000, 50000, 100000, 200000, 500000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-full border border-cozy-line bg-cozy-bg px-2.5 py-0.5 text-[11px] font-semibold text-cozy-muted transition hover:border-cozy-peach hover:text-cozy-text"
                >
                  +{preset.toLocaleString('vi-VN')}₫
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Ghi chú (VD: Trà sữa matcha, Mua sách giải tích, Tiền học bổng...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTransaction()}
              />
              <Button
                variant={txType === 'income' ? 'secondary' : 'primary'}
                onClick={addTransaction}
                disabled={!amount || Number(amount) <= 0}
                className="shrink-0"
              >
                <Plus size={16} /> Lưu giao dịch
              </Button>
            </div>
          </Card>
        </div>

        {/* CỘT PHẢI: DANH SÁCH GIAO DỊCH */}
        <Card className="flex flex-col p-5 xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-cozy-text">
              🧾 Lịch sử giao dịch ({visibleTransactions.length})
            </h2>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'expense', label: 'Khoản chi' },
              { id: 'income', label: 'Khoản thu' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={cx(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  typeFilter === f.id
                    ? 'bg-cozy-peach text-white'
                    : 'bg-cozy-blush text-cozy-muted hover:text-cozy-text'
                )}
              >
                {f.label}
              </button>
            ))}

            <Select
              className="ml-auto py-1 text-xs"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="all">Mọi danh mục</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </Select>
          </div>

          {visibleTransactions.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch nào"
              hint="Ghi lại một khoản thu hoặc chi ở khung bên trái để biểu đồ Donut bắt đầu xoay nhé!"
              size="w-36"
            />
          ) : (
            <ul className="cozy-scroll -mr-1 max-h-[540px] space-y-2 overflow-y-auto pr-1">
              {visibleTransactions.map((tx) => {
                const cat = CAT_MAP[tx.category] || CAT_MAP.other;
                const isIncome = tx.type === 'income';
                return (
                  <li
                    key={tx.id}
                    className="group flex items-center gap-3 rounded-2xl border border-cozy-line bg-white px-3.5 py-2.5 transition hover:shadow-sm"
                  >
                    <span
                      className={cx(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base',
                        cat.badge
                      )}
                    >
                      {cat.emoji}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-cozy-text">{tx.note}</p>
                      <p className="text-[11px] text-cozy-muted">
                        {cat.label} · {formatShortDate(tx.date)}
                      </p>
                    </div>

                    <span
                      className={cx(
                        'shrink-0 text-sm font-bold tabular-nums',
                        isIncome ? 'text-cozy-matcha' : 'text-cozy-text'
                      )}
                    >
                      {isIncome ? '+' : '-'}
                      {formatVND(tx.amount)}
                    </span>

                    <IconButton
                      title="Xóa giao dịch"
                      onClick={() => deleteTransaction(tx.id)}
                      className="opacity-0 transition group-hover:opacity-100"
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
  );
}

