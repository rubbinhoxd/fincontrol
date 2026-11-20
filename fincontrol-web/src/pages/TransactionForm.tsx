import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { createTransaction, getTransaction, updateTransaction } from '../api/transactions';
import { listCategories } from '../api/categories';
import { listCards } from '../api/cards';
import type { Category, TransactionType, TransactionRequest, Card } from '../types';

export default function TransactionForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExistingInstallment, setIsExistingInstallment] = useState(false);
  const [isExistingRecurring, setIsExistingRecurring] = useState(false);
  const [canActivateRecurring, setCanActivateRecurring] = useState(false);
  const [editScope, setEditScope] = useState<'single' | 'future' | 'all'>('single');

  const [form, setForm] = useState<TransactionRequest>({
    categoryId: '',
    type: 'EXPENSE',
    description: '',
    amount: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    planned: true,
    fixed: false,
    recurring: false,
    subscription: false,
    essential: true,
    impulse: false,
    notes: null,
    cardId: null,
    sharedWithPartner: false,
    activateRecurring: false,
    installment: false,
    currentInstallment: null,
    totalInstallments: null,
  });

  useEffect(() => {
    listCategories().then((res) => setCategories(res.data));
    listCards().then((res) => setCards(res.data));
  }, []);

  useEffect(() => {
    if (isEdit) {
      getTransaction(id).then((res) => {
        const t = res.data;
        const hasInstallment = t.installmentGroupId !== null;
        const hasRecurring = t.recurringGroupId !== null;
        setIsExistingInstallment(hasInstallment);
        setIsExistingRecurring(hasRecurring);
        setCanActivateRecurring(!hasInstallment && !hasRecurring);
        setForm({
          categoryId: t.categoryId,
          type: t.type,
          description: t.description,
          amount: t.amount,
          transactionDate: t.transactionDate,
          planned: t.planned,
          fixed: t.fixed,
          recurring: t.recurring,
          subscription: t.subscription,
          essential: t.essential,
          impulse: t.impulse,
          notes: t.notes,
          cardId: t.cardId,
          sharedWithPartner: t.sharedWithPartner,
          activateRecurring: false,
          installment: hasInstallment,
          currentInstallment: t.currentInstallment,
          totalInstallments: t.totalInstallments,
        });
      });
    }
  }, [id]);

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const selectedCard = cards.find((c) => c.id === form.cardId) ?? null;
  const canShare = !!selectedCard && selectedCard.shared;

  const update = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'subscription' && value) next.recurring = true;
      if (field === 'impulse' && value) next.planned = false;
      if (field === 'type') {
        next.categoryId = '';
        next.cardId = null;
        next.sharedWithPartner = false;
      }
      if (field === 'installment' && !value) {
        next.currentInstallment = null;
        next.totalInstallments = null;
      }
      if (field === 'cardId') {
        const c = cards.find((cc) => cc.id === value) ?? null;
        if (!c || !c.shared) next.sharedWithPartner = false;
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        const scope = (isExistingRecurring || isExistingInstallment) ? editScope : 'single';
        await updateTransaction(id, form, scope);
      } else {
        await createTransaction(form);
      }
      navigate('/transactions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title={isEdit ? 'Editar transação' : 'Nova transação'}>
      <form onSubmit={handleSubmit} className="card-neo max-w-3xl space-y-6">
        {/* Type selector */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-midnight-canvas)',
            border: '1px solid var(--color-steel-border)',
          }}
        >
          {(['EXPENSE', 'INCOME'] as TransactionType[]).map((t) => {
            const active = form.type === t;
            const label = t === 'EXPENSE' ? 'Despesa' : 'Receita';
            const activeColor = t === 'EXPENSE' ? 'var(--color-danger)' : 'var(--color-success)';
            return (
              <button
                key={t}
                type="button"
                onClick={() => update('type', t)}
                className="py-2 rounded-full text-sm transition-all"
                style={{
                  fontWeight: 500,
                  backgroundColor: active ? `color-mix(in oklab, ${activeColor} 16%, transparent)` : 'transparent',
                  color: active ? activeColor : 'var(--color-fog)',
                  border: active ? `1px solid color-mix(in oklab, ${activeColor} 40%, transparent)` : '1px solid transparent',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Descrição">
            <input
              type="text"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="input"
              required
              maxLength={200}
            />
          </Field>

          <Field label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount || ''}
              onChange={(e) => update('amount', parseFloat(e.target.value) || 0)}
              className="input"
              required
            />
          </Field>

          <Field label="Data">
            <input
              type="date"
              value={form.transactionDate}
              onChange={(e) => update('transactionDate', e.target.value)}
              className="input"
              required
            />
          </Field>

          <Field label="Categoria">
            <select
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              className="input"
              required
              style={{ cursor: 'pointer' }}
            >
              <option value="" style={{ backgroundColor: '#061e1a' }}>Selecione...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id} style={{ backgroundColor: '#061e1a' }}>{c.name}</option>
              ))}
            </select>
          </Field>

          {form.type === 'EXPENSE' && cards.length > 0 && (
            <Field label="Cartão (opcional)">
              <select
                value={form.cardId ?? ''}
                onChange={(e) => update('cardId', e.target.value || null)}
                className="input"
                style={{ cursor: 'pointer' }}
              >
                <option value="" style={{ backgroundColor: '#061e1a' }}>Sem cartão (PIX/débito/dinheiro)</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: '#061e1a' }}>
                    {c.name}{c.shared ? ' (compartilhado)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {form.type === 'EXPENSE' && canShare && (
          <Notice tone="signal">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.sharedWithPartner}
                onChange={(e) => update('sharedWithPartner', e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span style={{ fontWeight: 500, color: 'var(--color-signal)' }}>
                Dividido por casal? (50/50)
              </span>
            </label>
            {form.sharedWithPartner && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-mist)' }}>
                Sua parte será contabilizada como metade do valor.
              </p>
            )}
          </Notice>
        )}

        {form.type === 'EXPENSE' && (
          <>
            <div>
              <p className="label-meta mb-3">Classificação</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Toggle label="Planejado" checked={form.planned} onChange={(v) => update('planned', v)} />
                <Toggle label="Fixo" checked={form.fixed} onChange={(v) => update('fixed', v)} />
                <Toggle label="Recorrente" checked={form.recurring} onChange={(v) => update('recurring', v)} />
                <Toggle label="Assinatura" checked={form.subscription} onChange={(v) => update('subscription', v)} />
                <Toggle label="Essencial" checked={form.essential} onChange={(v) => update('essential', v)} />
                <Toggle label="Impulso" checked={form.impulse} onChange={(v) => update('impulse', v)} />
              </div>
            </div>

            {isEdit && canActivateRecurring && (
              <div>
                <p className="label-meta mb-3">Recorrência</p>
                <Toggle
                  label="Ativar recorrência (cria cópias para os próximos 12 meses)"
                  checked={form.activateRecurring}
                  onChange={(v) => update('activateRecurring', v)}
                />
              </div>
            )}

            {isExistingRecurring && (
              <Notice tone="signal">
                <p className="text-sm" style={{ color: 'var(--color-signal)', fontWeight: 500 }}>
                  Esta transação faz parte de um grupo recorrente.
                </p>
              </Notice>
            )}

            {!isEdit && form.recurring && !form.installment && (
              <Notice tone="signal">
                <p className="text-sm" style={{ color: 'var(--color-fog)' }}>
                  Ao criar com <strong style={{ color: 'var(--color-signal)' }}>Recorrente</strong> marcado, o sistema criará cópias automáticas para os próximos 12 meses.
                </p>
              </Notice>
            )}

            {(!isEdit || isExistingInstallment) && (
              <div>
                <p className="label-meta mb-3">Parcelamento</p>
                <Toggle
                  label="Parcelamento"
                  checked={form.installment}
                  onChange={(v) => update('installment', v)}
                  disabled={isExistingInstallment}
                />

                {form.installment && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Field label="Parcela atual">
                      <input
                        type="number"
                        min="1"
                        value={form.currentInstallment || ''}
                        onChange={(e) => update('currentInstallment', parseInt(e.target.value) || null)}
                        className="input"
                        required
                        disabled={isExistingInstallment}
                      />
                    </Field>
                    <Field label="Total de parcelas">
                      <input
                        type="number"
                        min="2"
                        value={form.totalInstallments || ''}
                        onChange={(e) => update('totalInstallments', parseInt(e.target.value) || null)}
                        className="input"
                        required
                        disabled={isExistingInstallment}
                      />
                    </Field>
                  </div>
                )}

                {isExistingInstallment && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-mist)' }}>
                    Campos de parcelamento não podem ser alterados após a criação.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <Field label="Observações (opcional)">
          <textarea
            value={form.notes || ''}
            onChange={(e) => update('notes', e.target.value || null)}
            className="input"
            rows={2}
            style={{ resize: 'vertical', minHeight: 60 }}
          />
        </Field>

        {/* Escopo da edicao */}
        {isEdit && (isExistingRecurring || isExistingInstallment) && (
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-signal) 5%, transparent)',
              border: '1px solid color-mix(in oklab, var(--color-signal) 25%, transparent)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-paper-white)', fontWeight: 500 }}>
              Essa transação faz parte de um grupo {isExistingRecurring ? 'recorrente' : 'parcelado'}. Aplicar a edição em:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { v: 'single' as const, label: 'Apenas esta' },
                { v: 'future' as const, label: 'Esta + futuras' },
                { v: 'all' as const, label: 'Todas (inclui passadas)' },
              ].map((opt) => {
                const active = editScope === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setEditScope(opt.v)}
                    className="py-2 px-3 text-sm rounded-full transition-all"
                    style={{
                      fontWeight: 500,
                      backgroundColor: active ? 'color-mix(in oklab, var(--color-signal) 18%, transparent)' : 'transparent',
                      color: active ? 'var(--color-signal)' : 'var(--color-fog)',
                      border: active
                        ? '1px solid color-mix(in oklab, var(--color-signal) 50%, transparent)'
                        : '1px solid var(--color-steel-border)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-mist)' }}>
              A data da transação não é propagada — cada ocorrência mantém sua data original.
            </p>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
              border: '1px solid color-mix(in oklab, var(--color-danger) 30%, transparent)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
          <button type="button" onClick={() => navigate('/transactions')} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </form>
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-meta block mb-2">{label}</label>
      {children}
    </div>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: 'signal' | 'warning' }) {
  const color = tone === 'signal' ? 'var(--color-signal)' : 'var(--color-warning)';
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 7%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
      }}
    >
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        backgroundColor: checked ? 'color-mix(in oklab, var(--color-signal) 12%, transparent)' : 'var(--color-midnight-canvas)',
        border: checked
          ? '1px solid color-mix(in oklab, var(--color-signal) 45%, transparent)'
          : '1px solid var(--color-steel-border)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        className="sr-only"
        disabled={disabled}
      />
      <span
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          backgroundColor: checked ? 'var(--color-signal)' : 'transparent',
          border: checked ? '1px solid var(--color-signal)' : '1px solid var(--color-mist)',
        }}
      >
        {checked && <Check size={10} strokeWidth={3} style={{ color: 'white' }} />}
      </span>
      <span
        className="text-sm"
        style={{
          color: checked ? 'var(--color-signal)' : 'var(--color-fog)',
          fontWeight: checked ? 500 : 400,
        }}
      >
        {label}
      </span>
    </label>
  );
}
