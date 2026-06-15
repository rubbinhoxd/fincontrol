import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import CardVisual from '../components/cards/CardVisual';
import { getCardCycleDetail } from '../api/cards';
import type { CardCycleDetail as CardCycleDetailType, Transaction, TransactionType } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';
import { formatDate } from '../utils/date';

export default function CardCycleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CardCycleDetailType | null>(null);
  const [referenceDate, setReferenceDate] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCardCycleDetail(id, referenceDate)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id, referenceDate]);

  const goPrevious = () => {
    if (!data) return;
    // Vai para uma data dentro do ciclo anterior: cycleEnd - 1 mes (cobre seguranca para meses curtos)
    const end = new Date(data.cycle.cycleEnd + 'T00:00:00');
    const prev = new Date(end);
    prev.setMonth(prev.getMonth() - 1);
    setReferenceDate(prev.toISOString().split('T')[0]);
  };

  const goNext = () => {
    if (!data) return;
    const end = new Date(data.cycle.cycleEnd + 'T00:00:00');
    const next = new Date(end);
    next.setMonth(next.getMonth() + 1);
    // Se a proxima data e no futuro distante, volta pra hoje (ciclo atual aberto)
    const today = new Date();
    if (next > today) {
      setReferenceDate(undefined);
    } else {
      setReferenceDate(next.toISOString().split('T')[0]);
    }
  };

  return (
    <PageContainer
      title="Fatura"
      action={
        <button onClick={() => navigate('/cards')} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
          <ArrowLeft size={16} /> Voltar
        </button>
      }
    >
      {loading || !data ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <CardVisual
              name={data.cycle.name}
              brand={data.cycle.brand}
              color={data.cycle.color}
              creditLimit={data.cycle.creditLimit}
              totalSpent={data.cycle.totalSpent}
              size="lg"
            />

            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              <button onClick={goPrevious} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.cycle.closed ? 'Fatura fechada' : `Fecha em ${data.cycle.daysUntilClosing} dia${data.cycle.daysUntilClosing === 1 ? '' : 's'}`}
                </p>
                <p className="text-sm font-medium dark:text-gray-100">{formatDateShort(data.cycle.cycleStart)} a {formatDateShort(data.cycle.cycleEnd)}</p>
              </div>
              <button
                onClick={goNext}
                disabled={!referenceDate}
                className={`p-1 rounded ${referenceDate ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-30 cursor-not-allowed'}`}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-3">
              <Stat label="Total da fatura" value={formatCurrency(data.cycle.totalSpent)} highlight />
              <Stat label="% do limite" value={formatPercent(data.cycle.percentOfLimit)} />
              <Stat label="% do salario" value={formatPercent(data.cycle.percentOfSalary)} />
              <Stat label="Limite" value={formatCurrency(data.cycle.creditLimit)} muted />
              <Stat label="Transacoes" value={String(data.cycle.transactionCount)} muted />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold dark:text-gray-100">Transacoes da fatura</h3>
              </div>
              {data.transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Nenhuma transacao neste ciclo.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descricao</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoria</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.transactions.map((t: Transaction) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-2 text-sm dark:text-gray-300">{formatDate(t.transactionDate)}</td>
                        <td className="px-4 py-2 text-sm font-medium dark:text-gray-100">
                          {t.description}
                          {t.currentInstallment && t.totalInstallments && (
                            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                              {t.currentInstallment}/{t.totalInstallments}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm dark:text-gray-300">
                          <span className="inline-flex items-center gap-1.5">
                            {t.categoryColor && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.categoryColor }} />}
                            {t.categoryName}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-sm font-semibold text-right ${badgeColor(t.type)}`}>
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-sm ${muted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
      <span className={`${highlight ? 'text-2xl font-bold text-danger' : muted ? 'text-sm text-gray-400 dark:text-gray-500' : 'text-base font-semibold dark:text-gray-100'}`}>{value}</span>
    </div>
  );
}

function badgeColor(type: TransactionType) {
  return type === 'INCOME' ? 'text-success' : 'text-danger';
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
