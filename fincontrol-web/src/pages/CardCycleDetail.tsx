import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import CardVisual from '../components/cards/CardVisual';
import { getCardCycleDetail } from '../api/cards';
import type { CardCycleDetail as CardCycleDetailType, Transaction } from '../types';
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
        <button
          onClick={() => navigate('/cards')}
          className="btn-ghost"
          style={{ fontSize: 14 }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
      }
    >
      {loading || !data ? (
        <div className="card-neo text-center py-16" style={{ color: 'var(--color-mist)' }}>Carregando...</div>
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

            <div
              className="flex items-center justify-between card-neo"
              style={{ padding: '10px 12px' }}
            >
              <button
                onClick={goPrevious}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: 'var(--color-fog)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 5%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="label-meta">
                  {data.cycle.closed ? 'Fatura fechada' : `Fecha em ${data.cycle.daysUntilClosing} dia${data.cycle.daysUntilClosing === 1 ? '' : 's'}`}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}>
                  {formatDateShort(data.cycle.cycleStart)} a {formatDateShort(data.cycle.cycleEnd)}
                </p>
              </div>
              <button
                onClick={goNext}
                disabled={!referenceDate}
                className="p-1.5 rounded-full transition-colors"
                style={{
                  color: 'var(--color-fog)',
                  opacity: referenceDate ? 1 : 0.3,
                  cursor: referenceDate ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => { if (referenceDate) e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 5%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="card-neo space-y-3">
              <Stat label="Fatura total" value={formatCurrency(data.cycle.totalSpent)} highlight />
              {data.cycle.shared && (
                <Stat label="Minha parte" value={formatCurrency(data.cycle.myShare)} share />
              )}
              <Stat label="% do limite" value={formatPercent(data.cycle.percentOfLimit)} />
              <Stat label="% do salário" value={formatPercent(data.cycle.percentOfSalary)} />
              <Stat label="Limite" value={formatCurrency(data.cycle.creditLimit)} muted />
              <Stat label="Transações" value={String(data.cycle.transactionCount)} muted />
              {data.cycle.shared && (
                <p
                  className="text-[11px] pt-3"
                  style={{
                    color: 'var(--color-mist)',
                    borderTop: '1px solid var(--color-steel-border)',
                  }}
                >
                  Cartão compartilhado — % do salário considera apenas a sua parte.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card-neo overflow-hidden" style={{ padding: 0 }}>
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--color-steel-border)' }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--color-paper-white)' }}>
                  Transações da fatura
                </h3>
              </div>
              {data.transactions.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--color-mist)' }}>
                  Nenhuma transação neste ciclo.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-steel-border)' }}>
                        <th className="label-meta text-left px-4 py-3">Data</th>
                        <th className="label-meta text-left px-4 py-3">Descrição</th>
                        <th className="label-meta text-left px-4 py-3">Categoria</th>
                        <th className="label-meta text-right px-4 py-3">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t: Transaction) => (
                        <tr
                          key={t.id}
                          className="transition-colors"
                          style={{ borderTop: '1px solid color-mix(in oklab, var(--color-steel-border) 50%, transparent)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 3%, transparent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-fog)' }}>{formatDate(t.transactionDate)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}>
                            {t.description}
                            {t.totalInstallments && (
                              <span
                                className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  fontWeight: 500,
                                  backgroundColor: 'color-mix(in oklab, #94a3b8 16%, transparent)',
                                  color: '#94a3b8',
                                  border: '1px solid color-mix(in oklab, #94a3b8 30%, transparent)',
                                }}
                              >
                                {t.currentInstallment ? `${t.currentInstallment}/${t.totalInstallments}` : `${t.totalInstallments}x`}
                              </span>
                            )}
                            {t.sharedWithPartner && (
                              <span
                                className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  fontWeight: 500,
                                  backgroundColor: 'color-mix(in oklab, var(--color-signal) 16%, transparent)',
                                  color: 'var(--color-signal)',
                                  border: '1px solid color-mix(in oklab, var(--color-signal) 30%, transparent)',
                                }}
                                title="Dividido 50/50 com parceiro"
                              >
                                ½ casal
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-fog)' }}>
                            <span className="inline-flex items-center gap-2">
                              {t.categoryColor && (
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: t.categoryColor }}
                                />
                              )}
                              {t.categoryName}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-right"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 500,
                              color: t.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                            }}
                          >
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ label, value, highlight, muted, share }: { label: string; value: string; highlight?: boolean; muted?: boolean; share?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="label-meta" style={{ opacity: muted ? 0.7 : 1 }}>{label}</span>
      <span
        style={{
          fontFamily: highlight || share ? 'var(--font-display)' : 'var(--font-sans)',
          fontWeight: highlight ? 500 : share ? 500 : muted ? 400 : 500,
          fontSize: highlight ? 22 : share ? 18 : 14,
          letterSpacing: highlight || share ? '-0.01em' : 0,
          color: highlight
            ? 'var(--color-danger)'
            : share
            ? 'var(--color-signal)'
            : muted
            ? 'var(--color-mist)'
            : 'var(--color-paper-white)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
