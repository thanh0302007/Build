// (6) Sổ thu chi & Quản lý Quỹ — Lưu bền vững (`cozy_expenses`):
//   1. Toàn bộ số dư hiện có (hỗ trợ chỉnh trực tiếp số dư thực tế + thanh phân bổ trực quan)
//   2. Chia số dư ra nhiều Quỹ tùy chỉnh (tạo/sửa/xóa quỹ, chọn màu & icon, chuyển tiền giữa các quỹ)
//   3. Danh sách các phần Cần chi tiêu trong tháng (thêm/sửa/xóa, sao chép tháng trước, bấm 1 chạm -> Đã chi)
//   4. Danh sách các khoản Đã chi của tháng (hỗ trợ chỉnh sửa trực tiếp, đổi quỹ, xem cơ cấu Donut)
//   5. Lịch sử giao dịch đầy đủ (Thu & Chi, lọc đa chiều, chỉnh sửa, hoàn tác xóa & xuất CSV)
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
  Search,
  Download,
  X,
  ArrowLeftRight,
  CheckCircle2,
  RotateCcw,
  Copy,
  PieChart,
  ListTodo,
  Receipt,
  Sparkles,
  BarChart3,
  Target,
} from 'lucide-react';
import { Card, Button, Input, Select, PageHeader, IconButton, Modal, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { ExpensePiggySvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import {
  uid,
  todayISO,
  formatShortDate,
  formatVND,
  parseCurrencyInput,
  formatThousandsInput,
  exportToCsv,
} from '../lib/utils.js';

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Ăn uống', emoji: '🍜', color: '#F4ACB7', badge: 'bg-cozy-peach/25' },
  { id: 'study', label: 'Học tập', emoji: '📚', color: '#A3C9A8', badge: 'bg-cozy-matcha/30' },
  { id: 'transport', label: 'Di chuyển', emoji: '🛵', color: '#B8D8E8', badge: 'bg-[#B8D8E8]/35' },
  { id: 'housing', label: 'Nhà ở & Hóa đơn', emoji: '🏠', color: '#F7C59F', badge: 'bg-[#F7C59F]/35' },
  { id: 'shopping', label: 'Mua sắm', emoji: '🛍️', color: '#E2D4F0', badge: 'bg-cozy-lavender' },
  { id: 'entertainment', label: 'Giải trí', emoji: '🎮', color: '#FFF3B0', badge: 'bg-cozy-butter' },
  { id: 'health', label: 'Sức khỏe', emoji: '💊', color: '#C7E5D8', badge: 'bg-[#C7E5D8]/45' },
  { id: 'other', label: 'Khác', emoji: '✨', color: '#E9DCCB', badge: 'bg-[#F0EAE1]' },
];

export const INCOME_CATEGORIES = [
  { id: 'income_salary', label: 'Lương / Part-time', emoji: '💼', color: '#A3C9A8', badge: 'bg-cozy-matcha/30' },
  { id: 'income_scholarship', label: 'Học bổng / Trợ cấp', emoji: '🎓', color: '#FFF3B0', badge: 'bg-cozy-butter' },
  { id: 'income_family', label: 'Gia đình gửi', emoji: '🏡', color: '#F4ACB7', badge: 'bg-cozy-peach/25' },
  { id: 'income_gift', label: 'Thưởng / Quà tặng', emoji: '🎁', color: '#E2D4F0', badge: 'bg-cozy-lavender' },
  { id: 'income_other', label: 'Khoản thu khác', emoji: '🌱', color: '#C7E5D8', badge: 'bg-cozy-matcha/20' },
];

const ALL_CAT_MAP = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.id, c])
);

const FUND_COLORS = [
  { id: 'peach', label: 'Hồng đào', hex: '#F4ACB7' },
  { id: 'matcha', label: 'Xanh Matcha', hex: '#A3C9A8' },
  { id: 'butter', label: 'Vàng bơ', hex: '#FFF3B0' },
  { id: 'lavender', label: 'Oải hương', hex: '#E2D4F0' },
  { id: 'sky', label: 'Xanh mây', hex: '#CBE4F9' },
  { id: 'apricot', label: 'Cam sữa', hex: '#F7C59F' },
];

const FUND_EMOJIS = ['🍜', '📚', '🐷', '🏠', '🛍️', '🎮', '🛵', '💊', '✈️', '🎁', '🌱', '💎'];

const STARTER_FUNDS = [
  { id: 'fund_living', name: 'Quỹ Sinh hoạt', emoji: '🍜', color: '#F4ACB7', allocated: 0 },
  { id: 'fund_study', name: 'Quỹ Học tập', emoji: '📚', color: '#A3C9A8', allocated: 0 },
  { id: 'fund_saving', name: 'Quỹ Tiết kiệm', emoji: '🐷', color: '#FFF3B0', allocated: 0 },
  { id: 'fund_flex', name: 'Quỹ Giải trí & Mua sắm', emoji: '🛍️', color: '#E2D4F0', allocated: 0 },
];

function parseSignedCurrencyInput(str) {
  const raw = String(str ?? '').trim();
  const isNeg = raw.startsWith('-');
  const abs = parseCurrencyInput(raw);
  return isNeg ? -abs : abs;
}

function ExpenseDonutChart({ breakdown, totalExpense, hoveredCat, onHoverCat }) {
  const r = 68;
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
  const visibleLegend = breakdown.filter(
    (b) => b.amount > 0 || ['food', 'study', 'housing', 'shopping'].includes(b.id)
  );

  return (
    <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row">
      <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgb(var(--cozy-line))" strokeWidth="22" />
          {segments.map((seg) => {
            const isHovered = hoveredCat === seg.id;
            return (
              <circle
                key={seg.id}
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? 26 : 22}
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={seg.offset}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => onHoverCat(seg.id)}
                onMouseLeave={() => onHoverCat(null)}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          {activeItem ? (
            <>
              <span className="text-base">{activeItem.emoji}</span>
              <span className="text-[11px] font-bold text-cozy-text">{activeItem.label}</span>
              <span className="text-xs font-bold text-cozy-text">{formatVND(activeItem.amount)}</span>
              <span className="text-[10px] font-semibold text-cozy-muted">
                {Math.round(activeItem.fraction * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-semibold text-cozy-muted">Tổng đã chi</span>
              <span className="mt-0.5 text-sm font-bold text-cozy-text">{formatVND(totalExpense)}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid w-full flex-1 grid-cols-1 gap-x-4 sm:grid-cols-2">
        {visibleLegend.map((item) => {
          const pct = totalExpense ? Math.round((item.amount / totalExpense) * 100) : 0;
          return (
            <div
              key={item.id}
              onMouseEnter={() => onHoverCat(item.id)}
              onMouseLeave={() => onHoverCat(null)}
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
              className={cx(
                'flex items-center justify-between py-2 text-xs transition',
                hoveredCat === item.id ? 'opacity-100' : 'opacity-90'
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="break-words font-semibold text-cozy-text">
                  {item.label}
                </span>
              </div>
              <div className="ml-2 shrink-0 whitespace-nowrap text-right">
                <span className="font-bold tabular-nums text-cozy-text">{formatVND(item.amount)}</span>
                <span className="ml-1.5 inline-block text-right text-[11px] font-medium text-[var(--text-muted)]">
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
  const { toast } = useToast();
  const today = todayISO();
  const [monthCursor, setMonthCursor] = useState(() => today.slice(0, 7)); // YYYY-MM

  // 1. Chỉnh trực tiếp Toàn bộ số dư & Ngân sách trần tháng
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');

  // 2. Modal Tạo / Sửa Quỹ & Chuyển tiền giữa các Quỹ
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [editingFundId, setEditingFundId] = useState(null);
  const [fundName, setFundName] = useState('');
  const [fundEmoji, setFundEmoji] = useState('🍜');
  const [fundColor, setFundColor] = useState('#F4ACB7');
  const [fundBalanceInput, setFundBalanceInput] = useState('');

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('unallocated');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState('');

  // 3. Form thêm nhanh & Modal sửa Khoản cần chi tiêu trong tháng
  const [planQuickTitle, setPlanQuickTitle] = useState('');
  const [planQuickAmount, setPlanQuickAmount] = useState('');
  const [planQuickFundId, setPlanQuickFundId] = useState('');
  const [planQuickCategory, setPlanQuickCategory] = useState('housing');

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planAmountInput, setPlanAmountInput] = useState('');
  const [planCategory, setPlanCategory] = useState('food');
  const [planFundId, setPlanFundId] = useState('');
  const [planDueDate, setPlanDueDate] = useState('');

  // 4. Modal Thêm / Chỉnh sửa Giao dịch (Thu / Đã chi)
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);
  const [txType, setTxType] = useState('expense'); // expense | income
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState('food');
  const [txFundId, setTxFundId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);

  // 5. Bộ lọc phần Đã chi tháng & Lịch sử giao dịch
  const [monthSpentFundFilter, setMonthSpentFundFilter] = useState('all');
  const [showDonut, setShowDonut] = useState(false);
  const [hoveredCat, setHoveredCat] = useState(null);

  const [historyScope, setHistoryScope] = useState('month'); // 'month' | 'all'
  const [typeFilter, setTypeFilter] = useState('all'); // all | expense | income
  const [fundFilter, setFundFilter] = useState('all'); // all | unallocated | <fundId>
  const [catFilter, setCatFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ================= DỮ LIỆU CHUẨN HÓA =================
  const transactions = useMemo(
    () => (Array.isArray(expenses?.transactions) ? expenses.transactions : []),
    [expenses]
  );

  const funds = useMemo(
    () => (Array.isArray(expenses?.funds) ? expenses.funds : STARTER_FUNDS),
    [expenses]
  );

  const fundMap = useMemo(() => Object.fromEntries(funds.map((f) => [f.id, f])), [funds]);

  const plannedExpenses = useMemo(
    () => (Array.isArray(expenses?.plannedExpenses) ? expenses.plannedExpenses : []),
    [expenses]
  );

  const baseBalance = Number(expenses?.baseBalance) || 0;

  // Toàn bộ số dư hiện có = baseBalance + Tổng thu toàn thời gian - Tổng chi toàn thời gian
  const { allTimeIncome, allTimeExpense, totalBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((t) => {
      const val = Number(t.amount) || 0;
      if (t.type === 'income') inc += val;
      else exp += val;
    });
    return {
      allTimeIncome: inc,
      allTimeExpense: exp,
      totalBalance: baseBalance + inc - exp,
    };
  }, [transactions, baseBalance]);

  // Tính số dư hiện tại của từng Quỹ:
  // fund.currentBalance = fund.allocated + thu vào quỹ - chi từ quỹ
  const computedFunds = useMemo(() => {
    const incByFund = {};
    const expByFund = {};
    const monthExpByFund = {};

    transactions.forEach((t) => {
      if (!t.fundId || !fundMap[t.fundId]) return;
      const val = Number(t.amount) || 0;
      if (t.type === 'income') {
        incByFund[t.fundId] = (incByFund[t.fundId] || 0) + val;
      } else {
        expByFund[t.fundId] = (expByFund[t.fundId] || 0) + val;
        if ((t.date || '').startsWith(monthCursor)) {
          monthExpByFund[t.fundId] = (monthExpByFund[t.fundId] || 0) + val;
        }
      }
    });

    return funds.map((f) => {
      const fInc = incByFund[f.id] || 0;
      const fExp = expByFund[f.id] || 0;
      const allocated = Number(f.allocated) || 0;
      const startingPool = Math.max(0, allocated + fInc);
      const currentBalance = allocated + fInc - fExp;
      const monthSpent = monthExpByFund[f.id] || 0;
      return {
        ...f,
        allocated,
        incomeTotal: fInc,
        expenseTotal: fExp,
        startingPool,
        currentBalance,
        monthSpent,
      };
    });
  }, [funds, fundMap, transactions, monthCursor]);

  const totalInFunds = useMemo(
    () => computedFunds.reduce((sum, f) => sum + f.currentBalance, 0),
    [computedFunds]
  );

  // Số dư tự do chưa chia vào quỹ nào — luôn đảm bảo: Tổng các quỹ + Chưa phân bổ === Toàn bộ số dư!
  const unallocatedBalance = totalBalance - totalInFunds;

  // Ngân sách trần của tháng đang chọn (tương thích ngược dữ liệu cũ)
  const monthlyBudget = useMemo(() => {
    const perMonth = expenses?.monthlyBudgets?.[monthCursor];
    if (perMonth !== undefined) return Number(perMonth) || 0;
    return Number(expenses?.monthlyBudget) || 0;
  }, [expenses, monthCursor]);

  // Giao dịch của tháng đang chọn
  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((t) => (t.date || '').startsWith(monthCursor))
        .sort(
          (a, b) =>
            (b.date || '').localeCompare(a.date || '') ||
            String(b.id).localeCompare(String(a.id))
        ),
    [transactions, monthCursor]
  );

  const monthExpenseList = useMemo(
    () =>
      monthTransactions.filter(
        (t) =>
          t.type !== 'income' &&
          (monthSpentFundFilter === 'all' ||
            (monthSpentFundFilter === 'unallocated' ? !t.fundId : t.fundId === monthSpentFundFilter))
      ),
    [monthTransactions, monthSpentFundFilter]
  );

  const { totalIncome, totalExpense, breakdown } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const byCat = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, 0]));
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

  // Danh sách Cần chi tiêu của tháng đang chọn
  const monthPlannedItems = useMemo(
    () => plannedExpenses.filter((p) => p.month === monthCursor),
    [plannedExpenses, monthCursor]
  );

  const unpaidPlannedItems = useMemo(
    () => monthPlannedItems.filter((p) => !p.paid),
    [monthPlannedItems]
  );

  const paidPlannedItems = useMemo(
    () => monthPlannedItems.filter((p) => p.paid),
    [monthPlannedItems]
  );

  const unpaidPlannedTotal = useMemo(
    () => unpaidPlannedItems.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [unpaidPlannedItems]
  );

  const prevMonthKey = useMemo(() => {
    const [y, m] = monthCursor.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthCursor]);

  const prevMonthPlannedCount = useMemo(
    () => plannedExpenses.filter((p) => p.month === prevMonthKey).length,
    [plannedExpenses, prevMonthKey]
  );

  // Lịch sử giao dịch đã lọc
  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const baseList =
      historyScope === 'month'
        ? monthTransactions
        : [...transactions].sort(
            (a, b) =>
              (b.date || '').localeCompare(a.date || '') ||
              String(b.id).localeCompare(String(a.id))
          );

    return baseList.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      if (fundFilter !== 'all') {
        if (fundFilter === 'unallocated' && t.fundId && fundMap[t.fundId]) return false;
        if (fundFilter !== 'unallocated' && t.fundId !== fundFilter) return false;
      }
      if (q && !(t.note || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [
    historyScope,
    monthTransactions,
    transactions,
    typeFilter,
    catFilter,
    fundFilter,
    fundMap,
    searchQuery,
  ]);

  // ================= HÀNH ĐỘNG ĐIỀU HƯỚNG & SỐ DƯ =================
  const shiftMonth = (delta) => {
    const [y, m] = monthCursor.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setEditingBudget(false);
  };

  const openBalanceModal = () => {
    setBalanceDraft(
      totalBalance < 0
        ? `-${formatThousandsInput(Math.abs(totalBalance))}`
        : totalBalance > 0
          ? formatThousandsInput(totalBalance)
          : ''
    );
    setBalanceModalOpen(true);
  };

  const saveTotalBalance = () => {
    const desiredTotal = parseSignedCurrencyInput(balanceDraft);
    const nextBase = desiredTotal - (allTimeIncome - allTimeExpense);
    setExpenses((prev) => ({
      ...prev,
      funds: Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS,
      baseBalance: nextBase,
    }));
    setBalanceModalOpen(false);
    toast({ message: `💰 Đã cập nhật toàn bộ số dư thành ${formatVND(desiredTotal)}!` });
  };

  const saveBudget = () => {
    const val = parseCurrencyInput(budgetDraft);
    setExpenses((prev) => ({
      ...prev,
      monthlyBudget: val,
      monthlyBudgets: {
        ...(prev?.monthlyBudgets || {}),
        [monthCursor]: val,
      },
    }));
    setEditingBudget(false);
    toast({ message: `🎯 Đã lưu hạn mức chi tháng ${monthCursor.slice(5)}: ${formatVND(val)}` });
  };

  // ================= HÀNH ĐỘNG QUẢN LÝ QUỸ TÙY CHỈNH =================
  const openCreateFund = () => {
    setEditingFundId(null);
    setFundName('');
    setFundEmoji(FUND_EMOJIS[funds.length % FUND_EMOJIS.length]);
    setFundColor(FUND_COLORS[funds.length % FUND_COLORS.length].hex);
    setFundBalanceInput(unallocatedBalance > 0 ? formatThousandsInput(unallocatedBalance) : '');
    setFundModalOpen(true);
  };

  const openEditFund = (fund) => {
    setEditingFundId(fund.id);
    setFundName(fund.name);
    setFundEmoji(fund.emoji || '🐷');
    setFundColor(fund.color || '#F4ACB7');
    setFundBalanceInput(
      fund.currentBalance > 0
        ? formatThousandsInput(fund.currentBalance)
        : fund.currentBalance < 0
          ? `-${formatThousandsInput(Math.abs(fund.currentBalance))}`
          : '0'
    );
    setFundModalOpen(true);
  };

  const saveFund = () => {
    const cleanName = fundName.trim();
    if (!cleanName) return;
    const desiredBalance = parseSignedCurrencyInput(fundBalanceInput);

    setExpenses((prev) => {
      const currentFunds = Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS;
      if (editingFundId) {
        const existingComputed = computedFunds.find((f) => f.id === editingFundId);
        const fInc = existingComputed?.incomeTotal || 0;
        const fExp = existingComputed?.expenseTotal || 0;
        const nextAllocated = desiredBalance - fInc + fExp;

        return {
          ...prev,
          funds: currentFunds.map((f) =>
            f.id === editingFundId
              ? { ...f, name: cleanName, emoji: fundEmoji || '🐷', color: fundColor, allocated: nextAllocated }
              : f
          ),
        };
      }

      const created = {
        id: `fund_${uid()}`,
        name: cleanName,
        emoji: fundEmoji || '🐷',
        color: fundColor,
        allocated: desiredBalance,
      };
      return {
        ...prev,
        funds: [...currentFunds, created],
      };
    });

    setFundModalOpen(false);
    toast({
      message: editingFundId
        ? `✏️ Đã cập nhật "${cleanName}" (${formatVND(desiredBalance)})!`
        : `🏺 Đã tạo quỹ mới "${cleanName}" với số dư ${formatVND(desiredBalance)}!`,
    });
  };

  const deleteFund = (fund) => {
    const snapshotFunds = funds;
    setExpenses((prev) => ({
      ...prev,
      funds: (Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS).filter((f) => f.id !== fund.id),
    }));
    toast({
      message: `Đã xóa quỹ "${fund.name}" (số dư được hoàn về Ví tự do)`,
      onUndo: () => {
        setExpenses((prev) => ({ ...prev, funds: snapshotFunds }));
      },
    });
  };

  const openTransferModal = () => {
    setTransferFrom('unallocated');
    setTransferTo(computedFunds[0]?.id || 'unallocated');
    setTransferAmountInput('');
    setTransferModalOpen(true);
  };

  const handleTransferFunds = () => {
    const amount = parseCurrencyInput(transferAmountInput);
    if (amount <= 0 || transferFrom === transferTo) return;

    setExpenses((prev) => {
      const currentFunds = Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS;
      return {
        ...prev,
        funds: currentFunds.map((f) => {
          let nextAlloc = Number(f.allocated) || 0;
          if (f.id === transferFrom) nextAlloc -= amount;
          if (f.id === transferTo) nextAlloc += amount;
          return nextAlloc !== f.allocated ? { ...f, allocated: nextAlloc } : f;
        }),
      };
    });

    const fromLabel =
      transferFrom === 'unallocated' ? 'Ví tự do (Chưa chia)' : fundMap[transferFrom]?.name || 'Quỹ nguồn';
    const toLabel =
      transferTo === 'unallocated' ? 'Ví tự do (Chưa chia)' : fundMap[transferTo]?.name || 'Quỹ đích';

    setTransferModalOpen(false);
    toast({ message: `⇄ Đã chuyển ${formatVND(amount)} từ "${fromLabel}" sang "${toLabel}"!` });
  };

  // ================= HÀNH ĐỘNG DANH SÁCH CẦN CHI TIÊU THÁNG =================
  const handleQuickAddPlanned = () => {
    const title = planQuickTitle.trim();
    const amount = parseCurrencyInput(planQuickAmount);
    if (!title || amount <= 0) return;

    const item = {
      id: uid(),
      month: monthCursor,
      title,
      amount,
      category: planQuickCategory || 'other',
      fundId: planQuickFundId || '',
      dueDate: '',
      paid: false,
      paidTxId: null,
    };

    setExpenses((prev) => ({
      ...prev,
      funds: Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS,
      plannedExpenses: [item, ...(prev?.plannedExpenses || [])],
    }));

    setPlanQuickTitle('');
    setPlanQuickAmount('');
    toast({ message: `📋 Đã thêm khoản cần chi "${title}" (${formatVND(amount)})` });
  };

  const openCreatePlannedModal = () => {
    setEditingPlanId(null);
    setPlanTitle('');
    setPlanAmountInput('');
    setPlanCategory('housing');
    setPlanFundId(computedFunds[0]?.id || '');
    setPlanDueDate(`${monthCursor}-${today.slice(8, 10)}`);
    setPlanModalOpen(true);
  };

  const openEditPlannedModal = (item) => {
    setEditingPlanId(item.id);
    setPlanTitle(item.title || '');
    setPlanAmountInput(formatThousandsInput(item.amount));
    setPlanCategory(item.category || 'other');
    setPlanFundId(item.fundId || '');
    setPlanDueDate(item.dueDate || '');
    setPlanModalOpen(true);
  };

  const savePlannedItem = () => {
    const title = planTitle.trim();
    const amount = parseCurrencyInput(planAmountInput);
    if (!title || amount <= 0) return;

    setExpenses((prev) => {
      const list = Array.isArray(prev?.plannedExpenses) ? prev.plannedExpenses : [];
      if (editingPlanId) {
        const target = list.find((p) => p.id === editingPlanId);
        const updatedList = list.map((p) =>
          p.id === editingPlanId
            ? {
                ...p,
                title,
                amount,
                category: planCategory,
                fundId: planFundId,
                dueDate: planDueDate,
              }
            : p
        );

        // Nếu khoản cần chi này đã thanh toán trước đó, đồng bộ luôn giao dịch đã chi liên kết!
        let updatedTxs = prev?.transactions || [];
        if (target?.paid && target?.paidTxId) {
          updatedTxs = updatedTxs.map((tx) =>
            tx.id === target.paidTxId
              ? {
                  ...tx,
                  amount,
                  category: planCategory,
                  fundId: planFundId,
                  note: title,
                }
              : tx
          );
        }

        return {
          ...prev,
          plannedExpenses: updatedList,
          transactions: updatedTxs,
        };
      }

      const created = {
        id: uid(),
        month: monthCursor,
        title,
        amount,
        category: planCategory,
        fundId: planFundId,
        dueDate: planDueDate,
        paid: false,
        paidTxId: null,
      };
      return {
        ...prev,
        funds: Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS,
        plannedExpenses: [created, ...list],
      };
    });

    setPlanModalOpen(false);
    toast({
      message: editingPlanId
        ? `✏️ Đã cập nhật khoản cần chi "${title}"!`
        : `📋 Đã thêm "${title}" vào danh sách cần chi!`,
    });
  };

  const markPlannedAsPaid = (item) => {
    if (item.paid) return;
    const txId = uid();
    const paidDate =
      today.startsWith(monthCursor) ? today : item.dueDate?.startsWith(monthCursor) ? item.dueDate : `${monthCursor}-01`;

    const newTx = {
      id: txId,
      amount: Number(item.amount) || 0,
      type: 'expense',
      category: item.category || 'other',
      fundId: item.fundId || '',
      note: item.title,
      date: paidDate,
      plannedId: item.id,
    };

    setExpenses((prev) => ({
      ...prev,
      funds: Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS,
      plannedExpenses: (prev?.plannedExpenses || []).map((p) =>
        p.id === item.id ? { ...p, paid: true, paidTxId: txId } : p
      ),
      transactions: [newTx, ...(prev?.transactions || [])],
    }));

    const fundNameLabel = item.fundId && fundMap[item.fundId] ? ` (trích ${fundMap[item.fundId].name})` : '';
    toast({
      message: `✅ Đã chi "${item.title}" -${formatVND(item.amount)}${fundNameLabel}!`,
    });
  };

  const unmarkPlannedPaid = (item) => {
    setExpenses((prev) => ({
      ...prev,
      plannedExpenses: (prev?.plannedExpenses || []).map((p) =>
        p.id === item.id ? { ...p, paid: false, paidTxId: null } : p
      ),
      transactions: item.paidTxId
        ? (prev?.transactions || []).filter((t) => t.id !== item.paidTxId)
        : prev?.transactions || [],
    }));
    toast({ message: `↩️ Đã chuyển "${item.title}" về danh sách Chưa chi & hoàn lại số dư!` });
  };

  const deletePlannedItem = (item) => {
    const prevPlans = plannedExpenses;
    setExpenses((prev) => ({
      ...prev,
      plannedExpenses: (prev?.plannedExpenses || []).filter((p) => p.id !== item.id),
    }));
    toast({
      message: `Đã xóa mục cần chi "${item.title}"`,
      onUndo: () => {
        setExpenses((prev) => ({ ...prev, plannedExpenses: prevPlans }));
      },
    });
  };

  const copyPlannedFromPrevMonth = () => {
    const sourceItems = plannedExpenses.filter((p) => p.month === prevMonthKey);
    if (!sourceItems.length) return;
    const cloned = sourceItems.map((p) => ({
      ...p,
      id: uid(),
      month: monthCursor,
      dueDate: p.dueDate ? `${monthCursor}${p.dueDate.slice(7)}` : '',
      paid: false,
      paidTxId: null,
    }));
    setExpenses((prev) => ({
      ...prev,
      plannedExpenses: [...cloned, ...(prev?.plannedExpenses || [])],
    }));
    toast({ message: `📋 Đã sao chép ${cloned.length} khoản cần chi từ tháng ${prevMonthKey.slice(5)}!` });
  };

  // ================= HÀNH ĐỘNG GIAO DỊCH (ĐÃ CHI THÁNG & LỊCH SỬ) =================
  const openCreateTxModal = (presetType = 'expense', presetFundId = '') => {
    setEditingTxId(null);
    setTxType(presetType);
    setAmountInput('');
    setCategory(presetType === 'income' ? 'income_salary' : 'food');
    setTxFundId(presetFundId);
    setNote('');
    setDate(today.startsWith(monthCursor) ? today : `${monthCursor}-01`);
    setTxModalOpen(true);
  };

  const startEditTx = (tx) => {
    setEditingTxId(tx.id);
    setTxType(tx.type === 'income' ? 'income' : 'expense');
    setAmountInput(formatThousandsInput(tx.amount));
    setCategory(tx.category || (tx.type === 'income' ? 'income_other' : 'other'));
    setTxFundId(tx.fundId || '');
    setNote(tx.note || '');
    setDate(tx.date || today);
    setTxModalOpen(true);
  };

  const handleSwitchType = (nextType) => {
    setTxType(nextType);
    if (nextType === 'income' && !category.startsWith('income_')) {
      setCategory('income_salary');
    } else if (nextType === 'expense' && category.startsWith('income_')) {
      setCategory('food');
    }
  };

  const saveTransaction = () => {
    const cleanAmount = parseCurrencyInput(amountInput);
    if (cleanAmount <= 0) return;

    const catObj = ALL_CAT_MAP[category];
    const item = {
      id: editingTxId || uid(),
      amount: cleanAmount,
      type: txType,
      category,
      fundId: txFundId || '',
      note: note.trim() || catObj?.label || (txType === 'income' ? 'Khoản thu' : 'Chi tiêu'),
      date: date || today,
    };

    if (editingTxId) {
      setExpenses((prev) => ({
        ...prev,
        funds: Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS,
        transactions: (prev?.transactions || []).map((t) =>
          t.id === editingTxId ? { ...t, ...item } : t
        ),
        // Đồng bộ tên & số tiền nếu giao dịch này sinh ra từ mục Cần chi tiêu
        plannedExpenses: (prev?.plannedExpenses || []).map((p) =>
          p.paidTxId === editingTxId
            ? {
                ...p,
                title: item.note,
                amount: item.amount,
                category: item.category,
                fundId: item.fundId,
              }
            : p
        ),
      }));
      toast({ message: '✏️ Đã lưu chỉnh sửa giao dịch & cập nhật số dư!' });
    } else {
      setExpenses((prev) => ({
        ...prev,
        funds: Array.isArray(prev?.funds) ? prev.funds : STARTER_FUNDS,
        transactions: [item, ...(prev?.transactions || [])],
      }));
      toast({
        message: `🐷 Đã ghi ${txType === 'income' ? '+' : '-'}${formatVND(cleanAmount)}`,
      });
    }

    setTxModalOpen(false);
    if (item.date.slice(0, 7) !== monthCursor) {
      setMonthCursor(item.date.slice(0, 7));
    }
  };

  const deleteTransaction = (tx) => {
    const prevList = expenses?.transactions || [];
    const prevPlans = expenses?.plannedExpenses || [];
    const idx = prevList.findIndex((t) => t.id === tx.id);

    setExpenses((prev) => ({
      ...prev,
      transactions: (prev?.transactions || []).filter((t) => t.id !== tx.id),
      plannedExpenses: (prev?.plannedExpenses || []).map((p) =>
        p.paidTxId === tx.id ? { ...p, paid: false, paidTxId: null } : p
      ),
    }));

    toast({
      message: `Đã xóa "${tx.note}" (${formatVND(tx.amount)})`,
      onUndo: () => {
        setExpenses((prev) => {
          const list = prev?.transactions || [];
          if (list.some((t) => t.id === tx.id)) return prev;
          const next = [...list];
          next.splice(Math.max(0, idx), 0, tx);
          return { ...prev, transactions: next, plannedExpenses: prevPlans };
        });
      },
    });
  };

  const handleExportMonthCsv = () => {
    const targetList = historyScope === 'all' ? filteredHistory : monthTransactions;
    if (!targetList.length) {
      toast({ message: 'Chưa có giao dịch nào để xuất CSV.', tone: 'info' });
      return;
    }
    const headers = ['Ngày', 'Loại', 'Quỹ', 'Danh mục', 'Số tiền (VND)', 'Ghi chú'];
    const rows = targetList.map((t) => [
      t.date,
      t.type === 'income' ? 'Khoản thu' : 'Khoản chi',
      t.fundId && fundMap[t.fundId] ? fundMap[t.fundId].name : 'Ví tự do (Chưa phân bổ)',
      ALL_CAT_MAP[t.category]?.label || t.category,
      t.type === 'income' ? t.amount : -t.amount,
      t.note || '',
    ]);
    exportToCsv(`CozySpace-ThuChi-${monthCursor}.csv`, headers, rows);
    toast({ message: `📊 Đã xuất file Excel CSV (${targetList.length} giao dịch)!` });
  };

  const activeCategoryOptions = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const cleanAmountPreview = parseCurrencyInput(amountInput);
  const budgetUsedPct = monthlyBudget ? Math.min(100, Math.round((totalExpense / monthlyBudget) * 100)) : 0;
  const remainingBudget = monthlyBudget - totalExpense;
  const [yearNum, monthNum] = monthCursor.split('-').map(Number);

  // Tỷ trọng thanh phân bổ Toàn bộ số dư
  const positivePoolBase = Math.max(
    1,
    computedFunds.reduce((s, f) => s + Math.max(0, f.currentBalance), 0) +
      Math.max(0, unallocatedBalance)
  );

  // Xem trước phần dư còn lại khi đang gõ số dư trong Modal Tạo/Sửa Quỹ
  const previewEditingFundCurrent = editingFundId
    ? computedFunds.find((f) => f.id === editingFundId)?.currentBalance || 0
    : 0;
  const availableBeforeEditingFund = unallocatedBalance + previewEditingFundCurrent;
  const draftFundVal = parseSignedCurrencyInput(fundBalanceInput);
  const remainingUnallocatedPreview = availableBeforeEditingFund - draftFundVal;

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* HEADER TRANG SỔ THU CHI                                           */}
      {/* ================================================================= */}
      <PageHeader
        icon={Wallet}
        title="Sổ thu chi & Quản lý Quỹ"
        subtitle="Theo dõi toàn bộ số dư, chia tiền vào nhiều quỹ tùy chỉnh, lên danh sách cần chi & quản lý lịch sử giao dịch"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openCreateTxModal('income', '')}
            >
              <TrendingUp size={14} /> + Khoản thu
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreateTxModal('expense', computedFunds[0]?.id || '')}
            >
              <Plus size={14} /> + Khoản chi
            </Button>
            <Button
              variant="soft"
              size="sm"
              onClick={handleExportMonthCsv}
              title="Xuất báo cáo ra Excel (.csv)"
            >
              <Download size={14} /> Xuất CSV
            </Button>

            <div className="flex items-center gap-1 rounded-2xl border border-cozy-line bg-cozy-card px-2 py-1 shadow-sm">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-xl p-1.5 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text"
                title="Tháng trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[108px] text-center text-sm font-bold text-cozy-text">
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
          </div>
        }
      />

      {/* ================================================================= */}
      {/* PHẦN 1: TOÀN BỘ SỐ DƯ & TỔNG QUAN PHÂN BỔ                        */}
      {/* ================================================================= */}
      <Card tone="blush" className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          {/* Cột Mascot Ống heo (`expense_piggy`) + Toàn bộ số dư */}
          <div className="flex flex-col items-center gap-4 sm:flex-row xl:min-w-[340px] xl:flex-1">
            <ImageSlot
              slotId="expense_piggy"
              defaultSvg={<ExpensePiggySvg />}
              fit="contain"
              compact
              className="aspect-[10/9] w-28 shrink-0 rounded-2xl sm:w-32"
            />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                  <Wallet size={13} strokeWidth={1.75} className="text-cozy-accent" /> Toàn bộ số dư hiện có
                </span>
                <button
                  type="button"
                  onClick={openBalanceModal}
                  style={{ border: '1px solid var(--border-subtle)' }}
                  className="inline-flex items-center gap-1 rounded-full bg-transparent px-2.5 py-0.5 text-xs font-semibold text-cozy-text transition hover:bg-black/5"
                >
                  <Pencil size={11} strokeWidth={1.75} /> Chỉnh số dư
                </button>
              </div>

              <p
                className={cx(
                  'mt-1.5 whitespace-nowrap text-3xl font-bold tracking-tight tabular-nums sm:text-4xl',
                  totalBalance < 0 ? 'text-cozy-accent' : 'text-cozy-text'
                )}
              >
                {totalBalance < 0 ? `-${formatVND(Math.abs(totalBalance))}` : formatVND(totalBalance)}
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Tự động cộng/trừ khi phát sinh giao dịch · Sau khi trừ hết mục cần chi tháng {monthNum} dự kiến còn{' '}
                <b className="whitespace-nowrap tabular-nums text-cozy-text">
                  {totalBalance - unpaidPlannedTotal < 0
                    ? `-${formatVND(Math.abs(totalBalance - unpaidPlannedTotal))}`
                    : formatVND(totalBalance - unpaidPlannedTotal)}
                </b>
              </p>
            </div>
          </div>

          {/* Lưới thông số phẳng (không hộp viền lồng nhau, min-width: max-content để không cắt chữ) */}
          <div
            className="grid gap-x-6 gap-y-4 pt-4 xl:pt-0"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, max-content))',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div className="min-w-max">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-[var(--text-muted)]">
                <PiggyBank size={13} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Đã chia vào quỹ</span>
              </p>
              <p className="mt-1 whitespace-nowrap text-base font-bold tabular-nums text-cozy-text">
                {formatVND(totalInFunds)}
              </p>
              <p className="mt-0.5 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                {computedFunds.length} quỹ đang hoạt động
              </p>
            </div>

            <div className="min-w-max">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-[var(--text-muted)]">
                <Sparkles size={13} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Chưa phân bổ (Tự do)</span>
              </p>
              <p
                className={cx(
                  'mt-1 whitespace-nowrap text-base font-bold tabular-nums',
                  unallocatedBalance < 0 ? 'text-cozy-accent' : 'text-cozy-text'
                )}
              >
                {unallocatedBalance < 0
                  ? `-${formatVND(Math.abs(unallocatedBalance))}`
                  : formatVND(unallocatedBalance)}
              </p>
              <p className="mt-0.5 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                {unallocatedBalance < 0 ? 'Chia quỹ vượt tổng dư' : 'Sẵn sàng chia vào quỹ'}
              </p>
            </div>

            <div className="min-w-max">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-[var(--text-muted)]">
                <ListTodo size={13} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Cần chi tháng {monthNum}</span>
              </p>
              <p className="mt-1 whitespace-nowrap text-base font-bold tabular-nums text-cozy-text">
                {formatVND(unpaidPlannedTotal)}
              </p>
              <p className="mt-0.5 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                {unpaidPlannedItems.length} khoản chưa chi
              </p>
            </div>

            <div className="min-w-max">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-[var(--text-muted)]">
                <TrendingDown size={13} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Đã chi tháng {monthNum}</span>
              </p>
              <p className="mt-1 whitespace-nowrap text-base font-bold tabular-nums text-cozy-text">
                -{formatVND(totalExpense)}
              </p>
              <p className="mt-0.5 whitespace-nowrap text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
                Thu: +{formatVND(totalIncome)}
              </p>
            </div>
          </div>
        </div>

        {/* Thanh phân bổ Toàn bộ số dư theo từng Quỹ (Dòng phẳng, không đóng hộp lồng nhau) */}
        <div
          className="mt-5 pt-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-cozy-text">
              <BarChart3 size={14} strokeWidth={1.75} className="text-cozy-accent" />
              <span>Tỷ lệ phân bổ số dư giữa các quỹ</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {totalBalance > 0
                ? `Đã phân bổ ${Math.min(100, Math.max(0, Math.round((totalInFunds / totalBalance) * 100)))}% tổng số dư`
                : 'Bấm "Chỉnh số dư" để nhập tổng tiền hiện có của bạn'}
            </span>
          </div>

          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/5">
            {computedFunds
              .filter((f) => f.currentBalance > 0)
              .map((f) => (
                <div
                  key={f.id}
                  title={`${f.name}: ${formatVND(f.currentBalance)}`}
                  style={{
                    width: `${(f.currentBalance / positivePoolBase) * 100}%`,
                    backgroundColor: f.color,
                  }}
                  className="h-full border-r border-white/60 transition-all duration-300"
                />
              ))}
            {unallocatedBalance > 0 && (
              <div
                title={`Chưa phân bổ (Ví tự do): ${formatVND(unallocatedBalance)}`}
                style={{ width: `${(unallocatedBalance / positivePoolBase) * 100}%` }}
                className="h-full bg-[#EAE2D6] transition-all duration-300"
              />
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
            {computedFunds.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: f.color }}
                />
                <span className="text-cozy-text">{f.name}:</span>
                <b className="whitespace-nowrap tabular-nums text-cozy-text">{formatVND(f.currentBalance)}</b>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#EAE2D6]" />
              <span>Ví tự do (Chưa chia):</span>
              <b className="whitespace-nowrap tabular-nums text-cozy-text">
                {unallocatedBalance < 0
                  ? `-${formatVND(Math.abs(unallocatedBalance))}`
                  : formatVND(unallocatedBalance)}
              </b>
            </span>
          </div>
        </div>
      </Card>

      {/* ================================================================= */}
      {/* PHẦN 2: CHIA SỐ DƯ RA NHIỀU QUỸ TÙY CHỈNH                         */}
      {/* ================================================================= */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-cozy-text">
              <PiggyBank size={18} strokeWidth={1.75} className="text-cozy-accent" />
              <span>Chia số dư thành các Quỹ tùy chỉnh</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Tạo không giới hạn các hũ chi tiêu / tiết kiệm, tùy chỉnh số dư từng quỹ và trích chi tiêu trực tiếp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {computedFunds.length > 0 && (
              <Button variant="soft" size="sm" onClick={openTransferModal}>
                <ArrowLeftRight size={14} /> Chuyển tiền giữa các quỹ
              </Button>
            )}
            <Button size="sm" onClick={openCreateFund}>
              <Plus size={14} /> Thêm quỹ mới
            </Button>
          </div>
        </div>

        {computedFunds.length === 0 ? (
          <EmptyState
            title="Chưa có quỹ chi tiêu nào"
            hint="Bấm [Thêm quỹ mới] để chia toàn bộ số dư thành các quỹ như Ăn uống, Học tập, Tiền trọ, Tiết kiệm..."
            size="w-32"
          >
            <Button size="sm" onClick={openCreateFund}>
              <Plus size={14} /> Tạo quỹ đầu tiên
            </Button>
          </EmptyState>
        ) : (
          <div
            className="grid gap-x-6 gap-y-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
          >
            {computedFunds.map((fund) => {
              const remainPct =
                fund.startingPool > 0
                  ? Math.min(100, Math.max(0, Math.round((fund.currentBalance / fund.startingPool) * 100)))
                  : fund.currentBalance > 0
                    ? 100
                    : 0;
              const shareOfTotal =
                totalBalance > 0 && fund.currentBalance > 0
                  ? Math.round((fund.currentBalance / totalBalance) * 100)
                  : 0;

              return (
                <div
                  key={fund.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  className="flex flex-col justify-between pb-4 pt-1 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: fund.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-bold leading-snug text-cozy-text">
                            {fund.name}
                          </h3>
                          <span className="text-[11px] font-medium text-[var(--text-muted)]">
                            {shareOfTotal > 0 ? `Chiếm ${shareOfTotal}% tổng số dư` : 'Quỹ tùy chỉnh'}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton title="Chỉnh sửa quỹ & số tiền" onClick={() => openEditFund(fund)}>
                          <Pencil size={13} />
                        </IconButton>
                        <IconButton title="Xóa quỹ" onClick={() => deleteFund(fund)}>
                          <Trash2 size={13} />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">Số dư còn trong quỹ</span>
                      <p
                        className={cx(
                          'whitespace-nowrap text-xl font-bold tabular-nums',
                          fund.currentBalance < 0 ? 'text-cozy-accent' : 'text-cozy-text'
                        )}
                      >
                        {fund.currentBalance < 0
                          ? `-${formatVND(Math.abs(fund.currentBalance))}`
                          : formatVND(fund.currentBalance)}
                      </p>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${remainPct}%`,
                          backgroundColor: fund.currentBalance < 0 ? '#E07A8C' : fund.color,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>Đã chi tháng {monthNum}:</span>
                      <b className="whitespace-nowrap tabular-nums text-cozy-text">-{formatVND(fund.monthSpent)}</b>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openEditFund(fund)}
                      style={{ border: '1px solid var(--border-subtle)' }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-cozy-text transition hover:bg-black/5"
                    >
                      <Pencil size={12} strokeWidth={1.75} /> Chia / Sửa số dư
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateTxModal('expense', fund.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-cozy-peach/45 px-2.5 py-1.5 text-[11px] font-bold text-[#2A2120] transition hover:bg-cozy-peach"
                    >
                      <Plus size={12} strokeWidth={1.75} /> Chi từ quỹ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ================================================================= */}
      {/* PHẦN 3: CẦN CHI TIÊU THÁNG (TRÁI) & ĐÃ CHI CỦA THÁNG (PHẢI)       */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* CỘT TRÁI: DANH SÁCH CÁC PHẦN CẦN CHI TIÊU TRONG THÁNG */}
        <Card className="flex flex-col p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-cozy-text">
                <ListTodo size={18} strokeWidth={1.75} className="text-cozy-accent" />
                Danh sách cần chi tiêu — Tháng {monthNum}/{yearNum}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Còn cần chi <b className="whitespace-nowrap tabular-nums text-cozy-text">{formatVND(unpaidPlannedTotal)}</b> · Đã hoàn tất{' '}
                {paidPlannedItems.length}/{monthPlannedItems.length} khoản
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {prevMonthPlannedCount > 0 && monthPlannedItems.length === 0 && (
                <Button variant="soft" size="sm" onClick={copyPlannedFromPrevMonth}>
                  <Copy size={13} /> Chép tháng trước
                </Button>
              )}
              <Button variant="soft" size="sm" onClick={openCreatePlannedModal}>
                <Plus size={14} /> Thêm chi tiết
              </Button>
            </div>
          </div>

          {/* Thanh thêm nhanh khoản cần chi (Phẳng, ô Khoản cần chi chiếm trọn dòng trên) */}
          <div
            className="mb-3 pb-3.5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Input
              placeholder="Khoản cần chi (VD: Tiền phòng, Điện nước, Học phí...)"
              value={planQuickTitle}
              onChange={(e) => setPlanQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAddPlanned()}
              className="w-full py-2 text-xs"
            />

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
              <Input
                inputMode="numeric"
                placeholder="Số tiền dự kiến (đ)"
                value={planQuickAmount}
                onChange={(e) => setPlanQuickAmount(formatThousandsInput(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAddPlanned()}
                className="py-2 text-xs font-bold tabular-nums sm:col-span-5"
              />
              <Select
                value={planQuickFundId}
                onChange={(e) => setPlanQuickFundId(e.target.value)}
                className="py-2 text-xs sm:col-span-7"
              >
                <option value="">Ví tự do (Chưa chọn quỹ)</option>
                {computedFunds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {EXPENSE_CATEGORIES.slice(0, 5).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPlanQuickCategory(cat.id)}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition',
                      planQuickCategory === cat.id
                        ? 'bg-black/5 font-bold text-cozy-text'
                        : 'text-[var(--text-muted)] hover:text-cozy-text'
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                onClick={handleQuickAddPlanned}
                disabled={!planQuickTitle.trim() || parseCurrencyInput(planQuickAmount) <= 0}
              >
                <Plus size={14} /> Thêm vào cần chi
              </Button>
            </div>
          </div>

          {monthPlannedItems.length === 0 ? (
            <EmptyState
              title="Chưa có mục cần chi nào trong tháng này"
              hint="Liệt kê trước các khoản sắp phải chi (tiền nhà, ăn uống, sách vở...) để chủ động cân đối quỹ nhé!"
              size="w-32"
            />
          ) : (
            <div className="cozy-scroll max-h-[430px] overflow-y-auto pr-1">
              {unpaidPlannedItems.map((item) => {
                const cat = ALL_CAT_MAP[item.category] || ALL_CAT_MAP.other;
                const fund = item.fundId ? fundMap[item.fundId] : null;
                return (
                  <div
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 transition hover:bg-black/[0.015]"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold leading-snug text-cozy-text">
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                          <span>{cat.label}</span>
                          {fund && <span>· {fund.name}</span>}
                          {item.dueDate && <span>· Hạn {formatShortDate(item.dueDate)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="mr-1 whitespace-nowrap text-sm font-bold tabular-nums text-cozy-text">
                        {formatVND(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => markPlannedAsPaid(item)}
                        title="Đánh dấu đã thanh toán & tự động ghi vào mục Đã chi của tháng"
                        style={{ border: '1px solid var(--border-subtle)' }}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1 text-[11px] font-semibold text-cozy-text transition hover:bg-black/5 active:scale-95"
                      >
                        <CheckCircle2 size={13} strokeWidth={1.75} className="text-cozy-accent" /> Đã chi
                      </button>
                      <IconButton
                        title="Chỉnh sửa khoản cần chi"
                        onClick={() => openEditPlannedModal(item)}
                      >
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton
                        title="Xóa khoản cần chi"
                        onClick={() => deletePlannedItem(item)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                );
              })}

              {paidPlannedItems.length > 0 && (
                <div className="pt-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    <CheckCircle2 size={12} strokeWidth={1.75} className="text-cozy-accent" />
                    <span>Đã thanh toán trong tháng ({paidPlannedItems.length})</span>
                  </p>
                  <div>
                    {paidPlannedItems.map((item) => {
                      const cat = ALL_CAT_MAP[item.category] || ALL_CAT_MAP.other;
                      const fund = item.fundId ? fundMap[item.fundId] : null;
                      return (
                        <div
                          key={item.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 opacity-75"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-xs font-semibold text-[var(--text-muted)] line-through">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">
                                Đã ghi vào Đã chi {fund ? `· ${fund.name}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="whitespace-nowrap text-xs font-bold tabular-nums text-[var(--text-muted)]">
                              {formatVND(item.amount)}
                            </span>
                            <IconButton
                              title="Chỉnh sửa khoản này"
                              onClick={() => openEditPlannedModal(item)}
                            >
                              <Pencil size={13} />
                            </IconButton>
                            <IconButton
                              title="Hoàn lại trạng thái Chưa chi & khôi phục số dư"
                              onClick={() => unmarkPlannedPaid(item)}
                            >
                              <RotateCcw size={13} />
                            </IconButton>
                            <IconButton title="Xóa" onClick={() => deletePlannedItem(item)}>
                              <Trash2 size={13} />
                            </IconButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* CỘT PHẢI: DANH SÁCH ĐÃ CHI CỦA THÁNG (CHỈNH SỬA TRỰC TIẾP) */}
        <Card className="flex flex-col p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-cozy-text">
                <TrendingDown size={18} strokeWidth={1.75} className="text-cozy-accent" />
                Đã chi của tháng {monthNum}/{yearNum}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Tổng đã chi: <b className="whitespace-nowrap tabular-nums text-cozy-text">-{formatVND(totalExpense)}</b> ({monthExpenseList.length}{' '}
                khoản) · Bấm biểu tượng bút để chỉnh sửa bất kỳ khoản nào
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="soft" size="sm" onClick={() => setShowDonut((v) => !v)}>
                <PieChart size={14} /> {showDonut ? 'Ẩn biểu đồ' : 'Biểu đồ'}
              </Button>
              <Button
                size="sm"
                onClick={() => openCreateTxModal('expense', computedFunds[0]?.id || '')}
              >
                <Plus size={14} /> Ghi khoản đã chi
              </Button>
            </div>
          </div>

          {/* Thanh hạn mức chi tiêu tháng (tùy chọn) + Bộ lọc quỹ (Phẳng, không lồng thẻ) */}
          <div
            className="mb-3 pb-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--text-muted)]">
                  <Target size={13} strokeWidth={1.75} className="text-cozy-accent" />
                  <span>Hạn mức chi tháng {monthNum}:</span>
                </span>
                {!editingBudget ? (
                  <>
                    <b className="whitespace-nowrap tabular-nums text-cozy-text">
                      {monthlyBudget ? formatVND(monthlyBudget) : 'Chưa đặt'}
                    </b>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetDraft(monthlyBudget ? formatThousandsInput(monthlyBudget) : '');
                        setEditingBudget(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-cozy-accent hover:underline"
                    >
                      <Pencil size={11} /> {monthlyBudget ? 'Sửa' : 'Đặt hạn mức'}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      inputMode="numeric"
                      placeholder="VD: 4.500.000"
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(formatThousandsInput(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
                      className="w-32 py-1 text-xs font-bold"
                    />
                    <Button size="sm" onClick={saveBudget}>
                      <Check size={13} />
                    </Button>
                    <IconButton onClick={() => setEditingBudget(false)} title="Hủy">
                      <X size={13} />
                    </IconButton>
                  </div>
                )}
              </div>

              <Select
                value={monthSpentFundFilter}
                onChange={(e) => setMonthSpentFundFilter(e.target.value)}
                className="py-1 text-xs"
              >
                <option value="all">Tất cả các quỹ</option>
                <option value="unallocated">Ví tự do (Chưa chọn quỹ)</option>
                {computedFunds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>

            {monthlyBudget > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                  <div
                    className={cx(
                      'h-full rounded-full transition-all',
                      budgetUsedPct >= 90 ? 'bg-cozy-peach' : 'bg-cozy-matcha'
                    )}
                    style={{ width: `${budgetUsedPct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {remainingBudget >= 0 ? (
                    <>
                      Còn trong hạn mức <b className="whitespace-nowrap tabular-nums text-cozy-text">{formatVND(remainingBudget)}</b> (
                      {100 - budgetUsedPct}%)
                    </>
                  ) : (
                    <span className="font-bold text-cozy-accent">
                      Đã vượt hạn mức {formatVND(Math.abs(remainingBudget))}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {showDonut && (
            <div
              className="mb-3 pb-3.5 animate-pop-in"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <ExpenseDonutChart
                breakdown={breakdown}
                totalExpense={totalExpense}
                hoveredCat={hoveredCat}
                onHoverCat={setHoveredCat}
              />
            </div>
          )}

          {monthExpenseList.length === 0 ? (
            <EmptyState
              title="Tháng này chưa có khoản đã chi nào"
              hint="Bấm [Đã chi] từ danh sách cần chi bên trái hoặc bấm [+ Ghi khoản đã chi] ở góc trên."
              size="w-32"
            />
          ) : (
            <ul className="cozy-scroll max-h-[430px] overflow-y-auto pr-1">
              {monthExpenseList.map((tx) => {
                const cat = ALL_CAT_MAP[tx.category] || ALL_CAT_MAP.other;
                const fund = tx.fundId ? fundMap[tx.fundId] : null;
                return (
                  <li
                    key={tx.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 transition hover:bg-black/[0.015]"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold leading-snug text-cozy-text">
                          {tx.note}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                          <span>{cat.label}</span>
                          <span>· {formatShortDate(tx.date)}</span>
                          <span>· {fund ? fund.name : 'Ví tự do'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-1.5 whitespace-nowrap text-sm font-bold tabular-nums text-cozy-text">
                        -{formatVND(tx.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditTx(tx)}
                        title="Chỉnh sửa khoản đã chi này"
                        style={{ border: '1px solid var(--border-subtle)' }}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1 text-[11px] font-semibold text-cozy-text transition hover:bg-black/5"
                      >
                        <Pencil size={12} strokeWidth={1.75} /> Sửa
                      </button>
                      <IconButton title="Xóa khoản chi" onClick={() => deleteTransaction(tx)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ================================================================= */}
      {/* PHẦN 4: LỊCH SỬ GIAO DỊCH ĐẦY ĐỦ (THU & CHI)                      */}
      {/* ================================================================= */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-cozy-text">
              <Receipt size={18} strokeWidth={1.75} className="text-cozy-accent" />
              <span>Lịch sử giao dịch ({filteredHistory.length})</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Tra cứu, lọc và chỉnh sửa mọi biến động số dư (cả Khoản thu lẫn Khoản chi)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex rounded-2xl p-0.5"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => setHistoryScope('month')}
                className={cx(
                  'rounded-xl px-3 py-1 text-xs font-bold transition',
                  historyScope === 'month'
                    ? 'bg-cozy-card text-cozy-text shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-cozy-text'
                )}
              >
                Tháng {monthNum}/{yearNum}
              </button>
              <button
                type="button"
                onClick={() => setHistoryScope('all')}
                className={cx(
                  'rounded-xl px-3 py-1 text-xs font-bold transition',
                  historyScope === 'all'
                    ? 'bg-cozy-card text-cozy-text shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-cozy-text'
                )}
              >
                Tất cả ({transactions.length})
              </button>
            </div>

            <Button size="sm" variant="soft" onClick={() => openCreateTxModal('expense', '')}>
              <Plus size={14} /> Ghi giao dịch mới
            </Button>
          </div>
        </div>

        {/* Bộ lọc đa chiều */}
        <div
          className="mb-3 grid grid-cols-1 gap-2.5 pb-3.5 md:grid-cols-12"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="relative md:col-span-4">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              className="py-2 pl-9 text-xs"
              placeholder="Tìm theo tên giao dịch, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="flex items-center gap-1 rounded-2xl p-1 md:col-span-3"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
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
                  'flex-1 rounded-xl py-1.5 text-xs font-bold transition',
                  typeFilter === f.id
                    ? 'bg-cozy-peach text-[#2A2120] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-cozy-text'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Select
            className="py-2 text-xs md:col-span-2"
            value={fundFilter}
            onChange={(e) => setFundFilter(e.target.value)}
          >
            <option value="all">Mọi nguồn quỹ</option>
            <option value="unallocated">Ví tự do (Chưa chia)</option>
            {computedFunds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>

          <Select
            className="py-2 text-xs md:col-span-3"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">Mọi danh mục</option>
            <optgroup label="Khoản chi">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Khoản thu">
              {INCOME_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch nào khớp bộ lọc"
            hint="Ghi lại khoản thu hoặc chi để lịch sử tự động lưu trữ chi tiết theo ngày và quỹ nhé!"
            size="w-32"
          />
        ) : (
          <ul className="cozy-scroll max-h-[480px] overflow-y-auto pr-1">
            {filteredHistory.map((tx) => {
              const isIncome = tx.type === 'income';
              const cat =
                ALL_CAT_MAP[tx.category] ||
                (isIncome ? ALL_CAT_MAP.income_other : ALL_CAT_MAP.other);
              const fund = tx.fundId ? fundMap[tx.fundId] : null;

              return (
                <li
                  key={tx.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 transition hover:bg-black/[0.015]"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug text-cozy-text">
                        {tx.note}
                      </p>

                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <span>{isIncome ? 'Khoản thu' : 'Khoản chi'}</span>
                        <span>· {formatShortDate(tx.date)}</span>
                        <span>· {cat.label}</span>
                        <span>· {fund ? fund.name : 'Ví tự do'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cx(
                        'mr-1 whitespace-nowrap text-sm font-bold tabular-nums',
                        isIncome ? 'text-[#3F7A49]' : 'text-cozy-text'
                      )}
                    >
                      {isIncome ? '+' : '-'}
                      {formatVND(tx.amount)}
                    </span>

                    <IconButton title="Chỉnh sửa giao dịch" onClick={() => startEditTx(tx)}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton title="Xóa giao dịch" onClick={() => deleteTransaction(tx)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ================================================================= */}
      {/* MODAL 1: CHỈNH TOÀN BỘ SỐ DƯ HIỆN CÓ                              */}
      {/* ================================================================= */}
      <Modal
        open={balanceModalOpen}
        onClose={() => setBalanceModalOpen(false)}
        title="Cập nhật Toàn bộ số dư hiện có"
        width="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-cozy-muted">
            Nhập tổng số tiền thực tế bạn đang có hiện tại (tiền mặt + tài khoản ngân hàng + ví điện tử). CozySpace sẽ tự động đồng bộ số dư gốc để mọi giao dịch Thu/Chi tiếp theo cộng trừ chính xác từ con số này!
          </p>

          <div>
            <label className="mb-1 block text-xs font-bold text-cozy-muted">
              Tổng số dư thực tế hiện có (₫)
            </label>
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="VD: 10.500.000"
              value={balanceDraft}
              onChange={(e) => {
                const raw = e.target.value;
                const neg = raw.trim().startsWith('-');
                const formatted = formatThousandsInput(raw);
                setBalanceDraft(neg && formatted ? `-${formatted}` : formatted);
              }}
              onKeyDown={(e) => e.key === 'Enter' && saveTotalBalance()}
              className="text-lg font-bold tabular-nums"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[1000000, 3000000, 5000000, 10000000, 20000000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBalanceDraft(formatThousandsInput(v))}
                className="rounded-full border border-cozy-line bg-cozy-blush px-2.5 py-1 text-[11px] font-bold text-cozy-text transition hover:border-cozy-peach"
              >
                {v.toLocaleString('vi-VN')}₫
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setBalanceModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={saveTotalBalance}>
              <Check size={15} /> Lưu tổng số dư
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: TẠO / CHỈNH SỬA QUỸ TÙY CHỈNH                           */}
      {/* ================================================================= */}
      <Modal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        title={editingFundId ? 'Chỉnh sửa Quỹ & Số dư' : 'Tạo Quỹ tùy chỉnh mới'}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-8">
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Tên quỹ</label>
              <Input
                autoFocus
                placeholder="VD: Quỹ Tiền trọ, Quỹ Ăn uống, Quỹ Mua Laptop..."
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveFund()}
              />
            </div>

            <div className="sm:col-span-4">
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Biểu tượng</label>
              <Input
                value={fundEmoji}
                onChange={(e) => setFundEmoji(e.target.value)}
                className="text-center text-lg"
                maxLength={4}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-cozy-muted">Chọn nhanh biểu tượng</label>
            <div className="flex flex-wrap gap-1.5">
              {FUND_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setFundEmoji(em)}
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-xl border text-base transition',
                    fundEmoji === em
                      ? 'border-cozy-peach bg-cozy-blush shadow-sm ring-2 ring-cozy-peach/30'
                      : 'border-cozy-line bg-cozy-card hover:bg-cozy-blush/50'
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-cozy-muted">Màu sắc thẻ quỹ</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {FUND_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFundColor(c.hex)}
                  className={cx(
                    'flex items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-[11px] font-bold text-[#2A2120] transition',
                    fundColor === c.hex ? 'border-[#2A2120] shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                  )}
                  style={{ backgroundColor: c.hex }}
                >
                  {fundColor === c.hex && <Check size={12} />} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <label className="font-bold text-cozy-muted">Số dư hiện tại chia cho quỹ này (₫)</label>
              <span className="text-[11px] font-semibold text-cozy-muted">
                Khả dụng chưa chia:{' '}
                <b className="text-cozy-text">{formatVND(Math.max(0, availableBeforeEditingFund))}</b>
              </span>
            </div>
            <Input
              inputMode="numeric"
              placeholder="VD: 2.000.000"
              value={fundBalanceInput}
              onChange={(e) => setFundBalanceInput(formatThousandsInput(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && saveFund()}
              className="font-bold tabular-nums"
            />

            {/* Nút chia nhanh theo % Toàn bộ số dư hoặc Lấy hết phần chưa chia */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {totalBalance > 0 &&
                [10, 20, 30, 50].map((pct) => {
                  const amt = Math.round((totalBalance * pct) / 100);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setFundBalanceInput(formatThousandsInput(amt))}
                      className="rounded-full border border-cozy-line bg-cozy-blush px-2.5 py-0.5 text-[11px] font-bold text-cozy-text transition hover:border-cozy-peach"
                    >
                      {pct}% tổng dư ({formatVND(amt)})
                    </button>
                  );
                })}
              {availableBeforeEditingFund > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFundBalanceInput(formatThousandsInput(Math.max(0, availableBeforeEditingFund)))
                  }
                  className="rounded-full bg-cozy-butter px-2.5 py-0.5 text-[11px] font-bold text-[#2A2120] transition hover:brightness-95"
                >
                  ✨ Lấy hết phần chưa chia ({formatVND(availableBeforeEditingFund)})
                </button>
              )}
            </div>

            <p className="mt-2 text-[11px] text-cozy-muted">
              Sau khi lưu quỹ này, số dư tự do chưa phân bổ sẽ còn:{' '}
              <b className={remainingUnallocatedPreview < 0 ? 'text-cozy-accent' : 'text-cozy-text'}>
                {remainingUnallocatedPreview < 0
                  ? `-${formatVND(Math.abs(remainingUnallocatedPreview))} (vượt tổng số dư)`
                  : formatVND(remainingUnallocatedPreview)}
              </b>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFundModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={saveFund} disabled={!fundName.trim()}>
              <Check size={15} /> {editingFundId ? 'Lưu cập nhật quỹ' : 'Tạo quỹ'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 3: CHUYỂN TIỀN GIỮA CÁC QUỸ                                 */}
      {/* ================================================================= */}
      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Chuyển tiền giữa các Quỹ"
        width="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-cozy-muted">Chuyển từ nguồn</label>
            <Select
              className="w-full"
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
            >
              <option value="unallocated">
                ✨ Ví tự do chưa chia ({formatVND(unallocatedBalance)})
              </option>
              {computedFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name} ({formatVND(f.currentBalance)})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-cozy-muted">Sang quỹ đích</label>
            <Select
              className="w-full"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            >
              <option value="unallocated">
                ✨ Ví tự do chưa chia ({formatVND(unallocatedBalance)})
              </option>
              {computedFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name} ({formatVND(f.currentBalance)})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-cozy-muted">Số tiền chuyển (₫)</label>
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="VD: 500.000"
              value={transferAmountInput}
              onChange={(e) => setTransferAmountInput(formatThousandsInput(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleTransferFunds()}
              className="font-bold tabular-nums"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setTransferModalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleTransferFunds}
              disabled={
                parseCurrencyInput(transferAmountInput) <= 0 || transferFrom === transferTo
              }
            >
              <ArrowLeftRight size={15} /> Xác nhận chuyển
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 4: THÊM / SỬA KHOẢN CẦN CHI TIÊU TRONG THÁNG                */}
      {/* ================================================================= */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={
          editingPlanId
            ? 'Chỉnh sửa khoản cần chi tiêu'
            : `Thêm khoản cần chi — Tháng ${monthNum}/${yearNum}`
        }
        width="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-cozy-muted">Tên khoản cần chi</label>
            <Input
              autoFocus
              placeholder="VD: Tiền thuê trọ, Tiền Internet, Đóng học phí..."
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePlannedItem()}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Số tiền dự kiến (₫)</label>
              <Input
                inputMode="numeric"
                placeholder="VD: 2.500.000"
                value={planAmountInput}
                onChange={(e) => setPlanAmountInput(formatThousandsInput(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && savePlannedItem()}
                className="font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">
                Hạn thanh toán (tùy chọn)
              </label>
              <Input
                type="date"
                value={planDueDate}
                onChange={(e) => setPlanDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Danh mục</label>
              <Select
                className="w-full"
                value={planCategory}
                onChange={(e) => setPlanCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Dự kiến trích từ quỹ</label>
              <Select
                className="w-full"
                value={planFundId}
                onChange={(e) => setPlanFundId(e.target.value)}
              >
                <option value="">Ví tự do (Chưa chọn quỹ)</option>
                {computedFunds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPlanModalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={savePlannedItem}
              disabled={!planTitle.trim() || parseCurrencyInput(planAmountInput) <= 0}
            >
              <Check size={15} /> {editingPlanId ? 'Lưu thay đổi' : 'Thêm vào danh sách'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 5: GHI MỚI / CHỈNH SỬA GIAO DỊCH (THU HOẶC ĐÃ CHI)          */}
      {/* ================================================================= */}
      <Modal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title={editingTxId ? 'Chỉnh sửa giao dịch' : 'Ghi giao dịch Thu / Chi mới'}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2 rounded-2xl bg-cozy-blush p-1">
            {[
              { id: 'expense', label: '💸 Khoản đã chi', activeClass: 'bg-cozy-peach text-[#2A2120]' },
              { id: 'income', label: '🌱 Khoản thu vào', activeClass: 'bg-cozy-matcha text-[#1E3322]' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSwitchType(t.id)}
                className={cx(
                  'flex-1 rounded-xl py-2 text-xs font-bold transition',
                  txType === t.id ? `${t.activeClass} shadow-sm` : 'text-cozy-muted hover:text-cozy-text'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Số tiền (₫)</label>
              <Input
                autoFocus
                inputMode="numeric"
                placeholder="VD: 45.000"
                value={amountInput}
                onChange={(e) => setAmountInput(formatThousandsInput(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && saveTransaction()}
                className="font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Ngày giao dịch</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {/* Mức tiền gợi ý nhanh */}
          <div className="flex flex-wrap gap-1.5">
            {(txType === 'income'
              ? [200000, 500000, 1000000, 2000000, 5000000]
              : [25000, 45000, 100000, 200000, 500000]
            ).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountInput(formatThousandsInput(preset))}
                className="rounded-full border border-cozy-line bg-cozy-blush/70 px-2.5 py-0.5 text-[11px] font-bold text-cozy-text transition hover:border-cozy-peach"
              >
                {preset.toLocaleString('vi-VN')}₫
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">
                {txType === 'income' ? 'Cộng vào quỹ nào?' : 'Trích từ quỹ nào?'}
              </label>
              <Select
                className="w-full"
                value={txFundId}
                onChange={(e) => setTxFundId(e.target.value)}
              >
                <option value="">✨ Ví tự do (Chưa phân bổ quỹ)</option>
                {computedFunds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name} ({formatVND(f.currentBalance)})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">
                {txType === 'income' ? 'Nguồn thu' : 'Danh mục chi'}
              </label>
              <Select
                className="w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {activeCategoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-cozy-muted">Tên khoản / Ghi chú</label>
            <Input
              placeholder={
                txType === 'income'
                  ? 'VD: Lương part-time, Học bổng, Gia đình gửi...'
                  : 'VD: Cơm trưa, Trà đào cam sả, Mua giáo trình...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveTransaction()}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setTxModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant={txType === 'income' ? 'secondary' : 'primary'}
              onClick={saveTransaction}
              disabled={cleanAmountPreview <= 0}
            >
              <Check size={15} /> {editingTxId ? 'Lưu chỉnh sửa' : 'Lưu giao dịch'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
