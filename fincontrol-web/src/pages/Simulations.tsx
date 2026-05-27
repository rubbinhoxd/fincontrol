import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, FlaskConical, AlertTriangle, TrendingDown } from 'lucide-react';
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
      title="Simulacoes"
      action={
        <div className="flex items-center gap-3">
          <button onClick={() => setYearMonth(previousYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium min-w-48 text-center">{formatYearMonth(yearMonth)}</span>
          <button onClick={() => setYearMonth(nextYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-primary/5 border border-primary/20 text-primary text-sm">
        <FlaskConical size={18} />
        <span>Modo simulacao — nada e salvo. Adicione transacoes hipoteticas e veja o impacto no seu mes.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda: entrada da simulacao */}
        <div className="space-y-6">
          {/* Salario simulado */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salario simulado (opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salaryOverride ?? ''}
              onChange={(e) => setSalaryOverride(e.target.value ? parseFloat(e.target.value) : null)}
              className="input"
              placeholder={real ? `Real: ${formatCurrency(real.salary)}` : 'Salario de referencia'}
            />
          </div>

          {/* Adicionar item */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="font-semibold dark:text-gray-100">Adicionar transacao hipotetica</h3>

            <div className="flex gap-2">
              {(['EXPENSE', 'INCOME'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateDraft('type', t)}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                    draft.type === t
                      ? t === 'EXPENSE' ? 'bg-danger text-white' : 'bg-success text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t === 'EXPENSE' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descricao</label>
                <input type="text" value={draft.description} onChange={(e) => updateDraft('description', e.target.value)} className="input" maxLength={200} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" value={draft.amount || ''} onChange={(e) => updateDraft('amount', parseFloat(e.target.value) || 0)} className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria (opcional)</label>
              <select value={draft.categoryId ?? ''} onChange={(e) => updateDraft('categoryId', e.target.value || null)} className="input">
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {draft.type === 'EXPENSE' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <MiniToggle label="Planejado" checked={draft.planned} onChange={(v) => updateDraft('planned', v)} />
                <MiniToggle label="Fixo" checked={draft.fixed} onChange={(v) => updateDraft('fixed', v)} />
                <MiniToggle label="Recorrente" checked={draft.recurring} onChange={(v) => updateDraft('recurring', v)} />
                <MiniToggle label="Assinatura" checked={draft.subscription} onChange={(v) => updateDraft('subscription', v)} />
                <MiniToggle label="Essencial" checked={draft.essential} onChange={(v) => updateDraft('essential', v)} />
                <MiniToggle label="Impulso" checked={draft.impulse} onChange={(v) => updateDraft('impulse', v)} />
              </div>
            )}

            <button onClick={addItem} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              <Plus size={16} /> Adicionar a simulacao
            </button>
          </div>

          {/* Lista de itens simulados */}
          {items.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold dark:text-gray-100 mb-3">Itens simulados ({items.length})</h3>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${item.type === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                        {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{item.description || 'Sem descricao'}</span>
                    </div>
                    <button onClick={() => removeItem(i)} className="p-1 text-gray-400 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita: resultado */}
        <div className="space-y-4">
          {!simulated || !real ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : (
            <>
              <AlertCard simulated={simulated} />
              <CompareCard label="Total gasto" realValue={real.totalExpense} simValue={simulated.totalExpense} invert />
              <CompareCard label="Saldo" realValue={real.balance} simValue={simulated.balance} />
              <CompareCard label="Disponivel no mes" realValue={real.availableToSpend} simValue={simulated.availableToSpend} />
              <ComparePercentCard label="% do salario comprometido" realValue={real.salaryCommittedPercent} simValue={simulated.salaryCommittedPercent} />
              <CompareCard label="Media por dia restante" realValue={real.averagePerDayRemaining} simValue={simulated.averagePerDayRemaining} subtitle={`${simulated.daysRemainingInMonth} dias restantes`} />
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function AlertCard({ simulated }: { simulated: Dashboard }) {
  const colors = {
    GREEN: 'bg-success/10 text-success border-success/30',
    YELLOW: 'bg-warning/10 text-warning border-warning/30',
    RED: 'bg-danger/10 text-danger border-danger/30',
  };
  const labels = { GREEN: 'Sob controle', YELLOW: 'Atencao', RED: 'Cuidado!' };
  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${colors[simulated.alertLevel]}`}>
      {simulated.alertLevel === 'GREEN' ? <TrendingDown size={20} /> : <AlertTriangle size={20} />}
      <span className="font-medium">{labels[simulated.alertLevel]}</span>
      <span>— {formatPercent(simulated.salaryCommittedPercent)} comprometido (simulado)</span>
    </div>
  );
}

function CompareCard({ label, realValue, simValue, subtitle, invert }: {
  label: string; realValue: number; simValue: number; subtitle?: string; invert?: boolean;
}) {
  const changed = realValue !== simValue;
  // invert=true: aumento e ruim (vermelho); senao aumento e bom (verde)
  const isGood = invert ? simValue <= realValue : simValue >= realValue;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        {changed && <span className="text-sm text-gray-400 line-through">{formatCurrency(realValue)}</span>}
        <span className={`text-2xl font-bold ${changed ? (isGood ? 'text-success' : 'text-danger') : 'text-gray-900 dark:text-gray-100'}`}>
          {formatCurrency(simValue)}
        </span>
      </div>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function ComparePercentCard({ label, realValue, simValue }: { label: string; realValue: number; simValue: number }) {
  const changed = realValue !== simValue;
  const isGood = simValue <= realValue;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        {changed && <span className="text-sm text-gray-400 line-through">{formatPercent(realValue)}</span>}
        <span className={`text-2xl font-bold ${changed ? (isGood ? 'text-success' : 'text-danger') : 'text-gray-900 dark:text-gray-100'}`}>
          {formatPercent(simValue)}
        </span>
      </div>
    </div>
  );
}

function MiniToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm ${
      checked ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
    }`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </span>
      {label}
    </label>
  );
}
