import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { getMonthlyReference, upsertMonthlyReference } from '../api/dashboard';
import { getCurrentYearMonth, formatYearMonth, previousYearMonth, nextYearMonth } from '../utils/date';

export default function MonthlyReference() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [salary, setSalary] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    getMonthlyReference(yearMonth)
      .then((res) => {
        setSalary(res.data.salary);
        setNotes(res.data.notes || '');
      })
      .catch(() => {
        setSalary(0);
        setNotes('');
      })
      .finally(() => setLoading(false));
  }, [yearMonth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await upsertMonthlyReference(yearMonth, { salary, notes: notes || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <PageContainer
      title="Referência Mensal"
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
      <div className="card-neo max-w-lg">
        <p className="text-sm mb-6" style={{ color: 'var(--color-fog)' }}>
          Configure o salário de referência para{' '}
          <strong style={{ color: 'var(--color-paper-white)' }}>{formatYearMonth(yearMonth)}</strong>.
          Este valor será usado para calcular os indicadores do dashboard. Se não configurado, herda o último valor cadastrado.
        </p>

        {loading ? (
          <div className="text-center py-8" style={{ color: 'var(--color-mist)' }}>Carregando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-meta block mb-2">Salário (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={salary || ''}
                onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label-meta block mb-2">Observações (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={2}
                placeholder="Ex: Salário + vale alimentação"
                style={{ resize: 'vertical', minHeight: 60 }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary">Salvar</button>
              {saved && (
                <span
                  className="inline-flex items-center gap-1.5 text-sm"
                  style={{ color: 'var(--color-success)', fontWeight: 500 }}
                >
                  <Check size={14} /> Salvo com sucesso!
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
