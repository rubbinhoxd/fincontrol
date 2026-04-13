import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { listTransactions, deleteTransaction } from '../api/transactions';
import { listCategories } from '../api/categories';
import type { Transaction, Category, TransactionType } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate, getCurrentYearMonth, formatYearMonth, previousYearMonth, nextYearMonth } from '../utils/date';

export default function Transactions() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      if (!confirm('Esta parcela e todas as parcelas futuras serao excluidas. Deseja continuar?')) return;
      await deleteTransaction(t.id, 'future');
    } else if (t.recurringGroupId) {
      const choice = prompt(
        'Esta transacao e recorrente. Digite:\n1 - Excluir apenas este mes\n2 - Excluir este e todos os meses seguintes\n\nOu cancele para voltar.'
      );
      if (!choice) return;
      if (choice === '2') {
        await deleteTransaction(t.id, 'future');
      } else {
        await deleteTransaction(t.id, 'single');
      }
    } else {
      if (!confirm('Deseja excluir esta transacao?')) return;
      await deleteTransaction(t.id, 'single');
    }
    load();
  };

  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const totalCount = transactions.length;

  const typeBadge = (type: TransactionType) =>
    type === 'INCOME'
      ? 'bg-success/10 text-success'
      : 'bg-danger/10 text-danger';

  return (
    <PageContainer
      title="Transacoes"
      action={
        <button
          onClick={() => navigate('/transactions/new')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          Nova transacao
        </button>
      }
    >
      {/* Month nav + filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setYearMonth(previousYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ChevronLeft size={18} />
          </button>
          <span className="font-medium min-w-40 text-center">{formatYearMonth(yearMonth)}</span>
          <button onClick={() => setYearMonth(nextYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ChevronRight size={18} />
          </button>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.type === 'INCOME' ? 'Receita' : 'Despesa'})</option>
          ))}
        </select>
      </div>

      {/* Totalizador */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {(filterType !== 'EXPENSE') && (
            <div className="bg-white dark:bg-gray-900 rounded-xl px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Receitas</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totalIncome)}</p>
            </div>
          )}
          {(filterType !== 'INCOME') && (
            <div className="bg-white dark:bg-gray-900 rounded-xl px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Despesas</p>
              <p className="text-lg font-bold text-danger">{formatCurrency(totalExpense)}</p>
            </div>
          )}
          {!filterType && (
            <div className="bg-white dark:bg-gray-900 rounded-xl px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
              <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 rounded-xl px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Transacoes</p>
            <p className="text-lg font-bold dark:text-gray-100">{totalCount}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhuma transacao encontrada.</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descricao</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tags</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{t.description}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      {t.categoryColor && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.categoryColor }} />}
                      {t.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge(t.type)}`}>
                      {t.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right ${t.type === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.currentInstallment && t.totalInstallments && <Tag label={`${t.currentInstallment}/${t.totalInstallments}`} color="bg-indigo-100 text-indigo-700" />}
                      {t.impulse && <Tag label="Impulso" color="bg-red-100 text-red-700" />}
                      {!t.planned && !t.impulse && <Tag label="Nao planejado" color="bg-orange-100 text-orange-700" />}
                      {t.fixed && <Tag label="Fixo" color="bg-blue-100 text-blue-700" />}
                      {t.subscription && <Tag label="Assinatura" color="bg-teal-100 text-teal-700" />}
                      {!t.essential && <Tag label="Superfluo" color="bg-purple-100 text-purple-700" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/transactions/${t.id}/edit`)} className="p-1 text-gray-400 hover:text-primary rounded">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-1 text-gray-400 hover:text-danger rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>{label}</span>;
}
