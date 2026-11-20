import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, FlaskConical, AlertTriangle, TrendingDown, Check } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { getDashboard, simulateDashboard } from '../api/dashboard';
import { listCategories } from '../api/categories';
import type { Dashboard, Category, SimulatedItem, TransactionType } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';
import { getCurrentYearMonth, formatYearMonth, previousYearMonth, nextYearMonth } from '../utils/date';

interface DraftItem extends SimulatedItem {
  description: string;
}

const emptyDraft = (): DraftItem => ({
  description: '',
  type: 'EXPENSE',
  amount: 0,
  categoryId: null,
  planned: true,
  fixed: false,
  recurring: false,
  subscription: false,
  essential: true,
  impulse: false,
  sharedWithPartner: false,
});

export default function Simulations() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [salaryOverride, setSalaryOverride] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft());

  const [real, setReal] = useState<Dashboard | null>(null);
  const [simulated, setSimulated] = useState<Dashboard | null>(null);

  useEffect(() => {
    listCategories().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    getDashboard(yearMonth).then((res) => setReal(res.data)).catch(() => setReal(null));
  }, [yearMonth]);

  useEffect(() => {
    simulateDashboard({
      yearMonth,
      salaryOverride,
      items: items.map(({ description: _description, ...rest }) => rest),
    })
      .then((res) => setSimulated(res.data))
      .catch(() => setSimulated(null));
  }, [yearMonth, salaryOverride, items]);

  const updateDraft = (field: string, value: any) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'subscription' && value) next.recurring = true;
      if (field === 'impulse' && value) next.planned = false;
      if (field === 'type') next.categoryId = null;
      return next;
    });
  };

  const addItem = () => {
    if (draft.amount <= 0) return;
    setItems((prev) => [...prev, draft]);
    setDraft(emptyDraft());
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredCategories = categories.filter((c) => c.type === draft.type);

  return (
    <PageContainer
      title="Simulações"
      action={
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-deep-surface)',
            border: '1px solid var(--color-steel-border)',
          }}
        >
          <button
            onClick={() => setYearMonth(previousYearMonth(yearMonth))}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: 'var(--color-fog)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 5%, transparent)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-sm min-w-36 text-center" style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}>
            {formatYearMonth(yearMonth)}
          </span>
          <button
            onClick={() => setYearMonth(nextYearMonth(yearMonth))}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: 'var(--color-fog)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 5%, transparent)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      }
    >
      <div
        className="flex items-center gap-2 p-3 mb-6 rounded-2xl text-sm"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--color-signal) 7%, transparent)',
          border: '1px solid color-mix(in oklab, var(--color-signal) 25%, transparent)',
          color: 'var(--color-signal)',
        }}
      >
        <FlaskConical size={16} />
        <span style={{ color: 'var(--color-fog)' }}>
          <strong style={{ color: 'var(--color-signal)' }}>Modo simulação</strong> — nada é salvo. Adicione transações hipotéticas e veja o impacto no seu mês.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Esquerda: entrada */}
        <div className="space-y-6">
          {/* Salário */}
          <div className="card-neo">
            <label className="label-meta block mb-2">Salário simulado (opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salaryOverride ?? ''}
              onChange={(e) => setSalaryOverride(e.target.value ? parseFloat(e.target.value) : null)}
              className="input"
              placeholder={real ? `Real: ${formatCurrency(real.salary)}` : 'Salário de referência'}
            />
          </div>

          {/* Adicionar item */}
          <div className="card-neo space-y-4">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                color: 'var(--color-paper-white)',
                fontSize: 16,
                letterSpacing: '-0.01em',
              }}
            >
              Adicionar transação hipotética
            </h3>

            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-full"
              style={{
                backgroundColor: 'var(--color-midnight-canvas)',
                border: '1px solid var(--color-steel-border)',
              }}
            >
              {(['EXPENSE', 'INCOME'] as TransactionType[]).map((t) => {
                const active = draft.type === t;
                const label = t === 'EXPENSE' ? 'Despesa' : 'Receita';
                const color = t === 'EXPENSE' ? 'var(--color-danger)' : 'var(--color-success)';
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateDraft('type', t)}
                    className="py-2 rounded-full text-sm transition-all"
                    style={{
                      fontWeight: 500,
                      backgroundColor: active ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
                      color: active ? color : 'var(--color-fog)',
                      border: active ? `1px solid color-mix(in oklab, ${color} 40%, transparent)` : '1px solid transparent',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-meta block mb-2">Descrição</label>
                <input type="text" value={draft.description} onChange={(e) => updateDraft('description', e.target.value)} className="input" maxLength={200} />
              </div>
              <div>
                <label className="label-meta block mb-2">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" value={draft.amount || ''} onChange={(e) => updateDraft('amount', parseFloat(e.target.value) || 0)} className="input" />
              </div>
            </div>

            <div>
              <label className="label-meta block mb-2">Categoria (opcional)</label>
              <select
                value={draft.categoryId ?? ''}
                onChange={(e) => updateDraft('categoryId', e.target.value || null)}
                className="input"
                style={{ cursor: 'pointer' }}
              >
                <option value="" style={{ backgroundColor: '#061e1a' }}>Sem categoria</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: '#061e1a' }}>{c.name}</option>
                ))}
              </select>
            </div>

            {draft.type === 'EXPENSE' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <MiniToggle label="Planejado" checked={draft.planned} onChange={(v) => updateDraft('planned', v)} />
                  <MiniToggle label="Fixo" checked={draft.fixed} onChange={(v) => updateDraft('fixed', v)} />
                  <MiniToggle label="Recorrente" checked={draft.recurring} onChange={(v) => updateDraft('recurring', v)} />
                  <MiniToggle label="Assinatura" checked={draft.subscription} onChange={(v) => updateDraft('subscription', v)} />
                  <MiniToggle label="Essencial" checked={draft.essential} onChange={(v) => updateDraft('essential', v)} />
                  <MiniToggle label="Impulso" checked={draft.impulse} onChange={(v) => updateDraft('impulse', v)} />
                </div>
                <MiniToggle label="Compartilhar 50/50 com parceiro" checked={draft.sharedWithPartner} onChange={(v) => updateDraft('sharedWithPartner', v)} />
              </>
            )}

            <button onClick={addItem} className="btn-primary">
              <Plus size={16} /> Adicionar à simulação
            </button>
          </div>

          {/* Itens */}
          {items.length > 0 && (
            <div className="card-neo">
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  color: 'var(--color-paper-white)',
                  fontSize: 16,
                }}
              >
                Itens simulados <span style={{ color: 'var(--color-mist)' }}>({items.length})</span>
              </h3>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-xl"
                    style={{
                      backgroundColor: 'var(--color-midnight-canvas)',
                      border: '1px solid var(--color-steel-border)',
                    }}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 500,
                          color: item.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                      >
                        {item.type === 'INCOME' ? '+' : '−'} {formatCurrency(item.amount)}
                      </span>
                      <span style={{ color: 'var(--color-fog)' }}>{item.description || 'Sem descrição'}</span>
                    </div>
                    <button
                      onClick={() => removeItem(i)}
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
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direita: resultado */}
        <div className="space-y-4">
          {!simulated || !real ? (
            <div className="card-neo text-center py-16" style={{ color: 'var(--color-mist)' }}>Carregando...</div>
          ) : (
            <>
              <AlertCard simulated={simulated} />
              <CompareCard label="Total gasto" realValue={real.totalExpense} simValue={simulated.totalExpense} invert />
              <CompareCard label="Saldo" realValue={real.balance} simValue={simulated.balance} />
              <CompareCard label="Disponível no mês" realValue={real.availableToSpend} simValue={simulated.availableToSpend} />
              <ComparePercentCard label="% do salário comprometido" realValue={real.salaryCommittedPercent} simValue={simulated.salaryCommittedPercent} />
              <CompareCard label="Média por dia restante" realValue={real.averagePerDayRemaining} simValue={simulated.averagePerDayRemaining} subtitle={`${simulated.daysRemainingInMonth} dias restantes`} />
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function AlertCard({ simulated }: { simulated: Dashboard }) {
  const colorMap = {
    GREEN: 'var(--color-success)',
    YELLOW: 'var(--color-warning)',
    RED: 'var(--color-danger)',
  };
  const labels = { GREEN: 'Sob controle', YELLOW: 'Atenção', RED: 'Cuidado!' };
  const color = colorMap[simulated.alertLevel];
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
        color,
      }}
    >
      {simulated.alertLevel === 'GREEN' ? <TrendingDown size={20} /> : <AlertTriangle size={20} />}
      <span style={{ fontWeight: 500 }}>{labels[simulated.alertLevel]}</span>
      <span style={{ color: 'var(--color-fog)' }}>— {formatPercent(simulated.salaryCommittedPercent)} comprometido (simulado)</span>
    </div>
  );
}

function CompareCard({ label, realValue, simValue, subtitle, invert }: {
  label: string; realValue: number; simValue: number; subtitle?: string; invert?: boolean;
}) {
  const changed = realValue !== simValue;
  const isGood = invert ? simValue <= realValue : simValue >= realValue;
  const color = changed
    ? isGood
      ? 'var(--color-success)'
      : 'var(--color-danger)'
    : 'var(--color-paper-white)';
  return (
    <div className="card-neo" style={{ padding: 20 }}>
      <p className="label-meta">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        {changed && (
          <span
            className="text-sm line-through"
            style={{ color: 'var(--color-mist)' }}
          >
            {formatCurrency(realValue)}
          </span>
        )}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 24,
            letterSpacing: '-0.01em',
            color,
          }}
        >
          {formatCurrency(simValue)}
        </span>
      </div>
      {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--color-mist)' }}>{subtitle}</p>}
    </div>
  );
}

function ComparePercentCard({ label, realValue, simValue }: { label: string; realValue: number; simValue: number }) {
  const changed = realValue !== simValue;
  const isGood = simValue <= realValue;
  const color = changed
    ? isGood
      ? 'var(--color-success)'
      : 'var(--color-danger)'
    : 'var(--color-paper-white)';
  return (
    <div className="card-neo" style={{ padding: 20 }}>
      <p className="label-meta">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        {changed && (
          <span
            className="text-sm line-through"
            style={{ color: 'var(--color-mist)' }}
          >
            {formatPercent(realValue)}
          </span>
        )}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 24,
            letterSpacing: '-0.01em',
            color,
          }}
        >
          {formatPercent(simValue)}
        </span>
      </div>
    </div>
  );
}

function MiniToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all text-sm"
      style={{
        backgroundColor: checked ? 'color-mix(in oklab, var(--color-signal) 12%, transparent)' : 'var(--color-midnight-canvas)',
        border: checked
          ? '1px solid color-mix(in oklab, var(--color-signal) 45%, transparent)'
          : '1px solid var(--color-steel-border)',
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span
        className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: checked ? 'var(--color-signal)' : 'transparent',
          border: checked ? '1px solid var(--color-signal)' : '1px solid var(--color-mist)',
        }}
      >
        {checked && <Check size={9} strokeWidth={3} style={{ color: 'white' }} />}
      </span>
      <span style={{ color: checked ? 'var(--color-signal)' : 'var(--color-fog)', fontWeight: checked ? 500 : 400 }}>
        {label}
      </span>
    </label>
  );
}
