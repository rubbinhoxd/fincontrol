import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { createTransaction, getTransaction, updateTransaction } from '../api/transactions';
import { listCategories } from '../api/categories';
import type { Category, TransactionType, TransactionRequest } from '../types';

export default function TransactionForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExistingInstallment, setIsExistingInstallment] = useState(false);
  const [isExistingRecurring, setIsExistingRecurring] = useState(false);
  const [canActivateRecurring, setCanActivateRecurring] = useState(false);

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
    activateRecurring: false,
    installment: false,
    currentInstallment: null,
    totalInstallments: null,
  });

  useEffect(() => {
    listCategories().then((res) => setCategories(res.data));
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
          activateRecurring: false,
          installment: hasInstallment,
          currentInstallment: t.currentInstallment,
          totalInstallments: t.totalInstallments,
        });
      });
    }
  }, [id]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const update = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'subscription' && value) next.recurring = true;
      if (field === 'impulse' && value) next.planned = false;
      if (field === 'type') next.categoryId = '';
      if (field === 'installment' && !value) {
        next.currentInstallment = null;
        next.totalInstallments = null;
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
        await updateTransaction(id, form);
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
    <PageContainer title={isEdit ? 'Editar transacao' : 'Nova transacao'}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 max-w-2xl space-y-5">
        {/* Type selector */}
        <div className="flex gap-2">
          {(['EXPENSE', 'INCOME'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update('type', t)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                form.type === t
                  ? t === 'EXPENSE' ? 'bg-danger text-white' : 'bg-success text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'EXPENSE' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Descricao">
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
            >
              <option value="">Selecione...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {form.type === 'EXPENSE' && (
          <>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Classificacao</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Toggle label="Planejado" checked={form.planned} onChange={(v) => update('planned', v)} />
                <Toggle label="Fixo" checked={form.fixed} onChange={(v) => update('fixed', v)} />
                <Toggle label="Recorrente" checked={form.recurring} onChange={(v) => update('recurring', v)} />
                <Toggle label="Assinatura" checked={form.subscription} onChange={(v) => update('subscription', v)} />
                <Toggle label="Essencial" checked={form.essential} onChange={(v) => update('essential', v)} />
                <Toggle label="Impulso" checked={form.impulse} onChange={(v) => update('impulse', v)} />
              </div>
            </div>

            {/* Recorrencia — ativar em transacao existente */}
            {isEdit && canActivateRecurring && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recorrencia</p>
                <Toggle
                  label="Ativar recorrencia (cria copias para os proximos 12 meses)"
                  checked={form.activateRecurring}
                  onChange={(v) => update('activateRecurring', v)}
                />
              </div>
            )}

            {isExistingRecurring && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary font-medium">Esta transacao faz parte de um grupo recorrente.</p>
              </div>
            )}

            {/* Nota ao criar com recorrente */}
            {!isEdit && form.recurring && !form.installment && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary">Ao criar com "Recorrente" marcado, o sistema criara copias automaticas para os proximos 12 meses.</p>
              </div>
            )}

            {/* Parcelamento */}
            {(!isEdit || isExistingInstallment) && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Parcelamento</p>
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
                  <p className="text-xs text-gray-400 mt-2">Campos de parcelamento nao podem ser alterados apos a criacao.</p>
                )}
              </div>
            )}
          </>
        )}

        <Field label="Observacoes (opcional)">
          <textarea
            value={form.notes || ''}
            onChange={(e) => update('notes', e.target.value || null)}
            className="input"
            rows={2}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
      disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
    } ${
      checked ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        className="sr-only"
        disabled={disabled}
      />
      <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </span>
      <span className="text-sm">{label}</span>
    </label>
  );
}
