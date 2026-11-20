import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { listTransactions, deleteTransaction } from '../api/transactions';
import { listCategories } from '../api/categories';
import type { Transaction, Category, TransactionType } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate, getCurrentYearMonth, formatYearMonth, previousYearMonth, nextYearMonth } from '../utils/date';
import { exportTransactionsToCsv, exportTransactionsToPdf } from '../utils/exportTransactions';

type SortColumn = 'date' | 'description' | 'category' | 'amount';

export default function Transactions() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterClassification, setFilterClassification] = useState<'' | 'INSTALLMENT' | 'FIXED' | 'AVULSO'>('');
  const [sort, setSort] = useState<{ column: SortColumn; direction: 'asc' | 'desc' } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const toggleSort = (column: SortColumn) => {
    setSort((current) => {
      if (!current || current.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  };

  const load = () => {
    setLoading(true);
    listTransactions(yearMonth, filterType || undefined, filterCategory || undefined)
      .then((res) => setTransactions(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    listCategories().then((res) => setCategories(res.data));
  }, []);

  useEffect(load, [yearMonth, filterType, filterCategory]);

  const handleDelete = async (t: { id: string; installmentGroupId: string | null; recurringGroupId: string | null }) => {
    if (t.installmentGroupId) {
      if (!confirm('Esta parcela e todas as parcelas futuras serão excluídas. Deseja continuar?')) return;
      await deleteTransaction(t.id, 'future');
    } else if (t.recurringGroupId) {
      const choice = prompt(
        'Esta transação é recorrente. Digite:\n1 - Excluir apenas este mês\n2 - Excluir este e todos os meses seguintes\n\nOu cancele para voltar.'
      );
      if (!choice) return;
      if (choice === '2') {
        await deleteTransaction(t.id, 'future');
      } else {
        await deleteTransaction(t.id, 'single');
      }
    } else {
      if (!confirm('Deseja excluir esta transação?')) return;
      await deleteTransaction(t.id, 'single');
    }
    load();
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterClassification === 'INSTALLMENT') return t.installmentGroupId !== null;
    if (filterClassification === 'FIXED') return t.fixed && t.installmentGroupId === null;
    if (filterClassification === 'AVULSO') return !t.fixed && t.installmentGroupId === null;
    return true;
  });

  const sortedTransactions = sort
    ? [...filteredTransactions].sort((a, b) => {
        const dir = sort.direction === 'asc' ? 1 : -1;
        switch (sort.column) {
          case 'date':
            return a.transactionDate.localeCompare(b.transactionDate) * dir;
          case 'description':
            return a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' }) * dir;
          case 'category':
            return (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'pt-BR', { sensitivity: 'base' }) * dir;
          case 'amount':
            return (a.amount - b.amount) * dir;
        }
      })
    : filteredTransactions;

  const totalIncome = filteredTransactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const totalCount = filteredTransactions.length;

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const buildExportMeta = () => {
    const typeLabel = filterType === 'INCOME' ? 'Receitas' : filterType === 'EXPENSE' ? 'Despesas' : 'Todos os tipos';
    const classificationLabel =
      filterClassification === 'INSTALLMENT' ? 'Parcelados' :
      filterClassification === 'FIXED' ? 'Fixos' :
      filterClassification === 'AVULSO' ? 'Avulsos' : '';
    const categoryLabel = filterCategory ? categories.find((c) => c.id === filterCategory)?.name ?? '' : '';
    return {
      yearMonth,
      yearMonthLabel: formatYearMonth(yearMonth),
      totalIncome,
      totalExpense,
      totalCount,
      filters: { type: typeLabel, classification: classificationLabel, category: categoryLabel },
    };
  };

  const handleExportCsv = () => {
    exportTransactionsToCsv(sortedTransactions, buildExportMeta());
    setExportOpen(false);
  };
  const handleExportPdf = () => {
    exportTransactionsToPdf(sortedTransactions, buildExportMeta());
    setExportOpen(false);
  };

  return (
    <PageContainer
      title="Transações"
      action={
        <div className="flex items-center gap-3">
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={sortedTransactions.length === 0}
              className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Exportar
              <ChevronDown size={14} />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 mt-2 w-48 z-10 overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-deep-surface)',
                  border: '1px solid var(--color-steel-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--color-fog)' }}
                >
                  <FileSpreadsheet size={16} /> CSV
                </button>
                <button
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--color-fog)' }}
                >
                  <FileText size={16} /> PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/transactions/new')} className="btn-primary">
            <Plus size={16} />
            Nova transação
          </button>
        </div>
      }
    >
      {/* Month nav + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-deep-surface)',
            border: '1px solid var(--color-steel-border)',
          }}
        >
          <button
            onClick={() => setYearMonth(previousYearMonth(yearMonth))}
            className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: 'var(--color-fog)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="px-2 text-sm min-w-36 text-center"
            style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}
          >
            {formatYearMonth(yearMonth)}
          </span>
          <button
            onClick={() => setYearMonth(nextYearMonth(yearMonth))}
            className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: 'var(--color-fog)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <FilterSelect
          value={filterType}
          onChange={(v) => setFilterType(v as TransactionType | '')}
          options={[
            { value: '', label: 'Todos os tipos' },
            { value: 'INCOME', label: 'Receitas' },
            { value: 'EXPENSE', label: 'Despesas' },
          ]}
        />

        <FilterSelect
          value={filterClassification}
          onChange={(v) => setFilterClassification(v as '' | 'INSTALLMENT' | 'FIXED' | 'AVULSO')}
          options={[
            { value: '', label: 'Todas as classificações' },
            { value: 'INSTALLMENT', label: 'Parcelados' },
            { value: 'FIXED', label: 'Fixos' },
            { value: 'AVULSO', label: 'Avulsos' },
          ]}
        />

        <FilterSelect
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: '', label: 'Todas as categorias' },
            ...categories.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.type === 'INCOME' ? 'Receita' : 'Despesa'})`,
            })),
          ]}
        />
      </div>

      {/* Totalizador */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {(filterType !== 'EXPENSE') && (
            <SummaryTile label="Receitas" value={formatCurrency(totalIncome)} tone="success" />
          )}
          {(filterType !== 'INCOME') && (
            <SummaryTile label="Despesas" value={formatCurrency(totalExpense)} tone="danger" />
          )}
          {!filterType && (
            <SummaryTile
              label="Saldo"
              value={formatCurrency(totalIncome - totalExpense)}
              tone={totalIncome - totalExpense >= 0 ? 'success' : 'danger'}
            />
          )}
          <SummaryTile label="Transações" value={String(totalCount)} tone="neutral" />
        </div>
      )}

      {loading ? (
        <div
          className="card-neo text-center py-16"
          style={{ color: 'var(--color-mist)' }}
        >
          Carregando...
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div
          className="card-neo text-center py-16"
          style={{ color: 'var(--color-mist)' }}
        >
          Nenhuma transação encontrada.
        </div>
      ) : (
        <div className="card-neo overflow-hidden" style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-steel-border)' }}>
                  <SortableHeader label="Data" column="date" align="left" sort={sort} onToggle={toggleSort} />
                  <SortableHeader label="Descrição" column="description" align="left" sort={sort} onToggle={toggleSort} />
                  <SortableHeader label="Categoria" column="category" align="left" sort={sort} onToggle={toggleSort} />
                  <th className="label-meta text-left px-4 py-4">Tipo</th>
                  <SortableHeader label="Valor" column="amount" align="right" sort={sort} onToggle={toggleSort} />
                  <th className="label-meta text-left px-4 py-4">Tags</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid color-mix(in oklab, var(--color-steel-border) 50%, transparent)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 3%, transparent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--color-fog)' }}>
                      {formatDate(t.transactionDate)}
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}>
                      {t.description}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className="inline-flex items-center gap-2" style={{ color: 'var(--color-fog)' }}>
                        {t.categoryColor && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: t.categoryColor }}
                          />
                        )}
                        {t.categoryName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <TypeBadge type={t.type} />
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-right"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: t.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    >
                      {t.type === 'INCOME' ? '+' : '−'} {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {t.cardName && (
                          <Tag
                            label={t.cardName}
                            color={t.cardColor || '#5c6f8a'}
                            hasDot
                          />
                        )}
                        {t.sharedWithPartner && <Tag label="½ casal" color="#10B981" />}
                        {t.totalInstallments && (
                          <Tag
                            label={t.currentInstallment ? `${t.currentInstallment}/${t.totalInstallments}` : `${t.totalInstallments}x`}
                            color="#94a3b8"
                          />
                        )}
                        {t.impulse && <Tag label="Impulso" color="#ff4433" />}
                        {!t.planned && !t.impulse && <Tag label="Não planejado" color="#ff8833" />}
                        {t.fixed && <Tag label="Fixo" color="#00acfe" />}
                        {t.subscription && <Tag label="Assinatura" color="#00cc4b" />}
                        {!t.essential && <Tag label="Supérfluo" color="#ff33aa" />}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/transactions/${t.id}/edit`)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--color-mist)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-signal)';
                            e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-signal) 10%, transparent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-mist)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--color-mist)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-danger)';
                            e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-danger) 10%, transparent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-mist)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-2 rounded-full transition-colors cursor-pointer"
      style={{
        backgroundColor: 'var(--color-deep-surface)',
        border: '1px solid var(--color-steel-border)',
        color: 'var(--color-fog)',
        fontWeight: 400,
        appearance: 'none',
        paddingRight: '32px',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999ca1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ backgroundColor: '#061e1a', color: '#ccced0' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: 'success' | 'danger' | 'neutral' }) {
  const valueColor =
    tone === 'success' ? 'var(--color-success)' :
    tone === 'danger' ? 'var(--color-danger)' :
    'var(--color-paper-white)';
  return (
    <div
      className="card-neo"
      style={{ padding: '14px 20px', minWidth: 140 }}
    >
      <p className="label-meta" style={{ marginBottom: 4 }}>{label}</p>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: '-0.01em',
          color: valueColor,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  const isIncome = type === 'INCOME';
  return (
    <span
      className="text-[11px] px-2.5 py-1 rounded-full"
      style={{
        fontWeight: 500,
        letterSpacing: '0.02em',
        backgroundColor: isIncome
          ? 'color-mix(in oklab, var(--color-success) 14%, transparent)'
          : 'color-mix(in oklab, var(--color-danger) 14%, transparent)',
        color: isIncome ? 'var(--color-success)' : 'var(--color-danger)',
      }}
    >
      {isIncome ? 'Receita' : 'Despesa'}
    </span>
  );
}

function Tag({ label, color, hasDot }: { label: string; color: string; hasDot?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        fontWeight: 500,
        letterSpacing: '0.02em',
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        color: color,
        border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      }}
    >
      {hasDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}

function SortableHeader({
  label,
  column,
  align,
  sort,
  onToggle,
}: {
  label: string;
  column: SortColumn;
  align: 'left' | 'right';
  sort: { column: SortColumn; direction: 'asc' | 'desc' } | null;
  onToggle: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  const Icon = active ? (sort!.direction === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className={`label-meta px-4 py-4 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onToggle(column)}
        className="inline-flex items-center gap-1.5 transition-colors"
        style={{
          color: active ? 'var(--color-signal)' : 'var(--color-mist)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
        <Icon size={12} className={active ? '' : 'opacity-60'} />
      </button>
    </th>
  );
}
