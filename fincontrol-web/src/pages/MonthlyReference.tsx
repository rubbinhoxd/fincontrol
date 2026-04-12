import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import PageContainer from '../components/layout/PageContainer';
import { getMonthlyReference, upsertMonthlyReference } from '../api/dashboard';
import { getCurrentYearMonth, formatYearMonth } from '../utils/date';

export default function MonthlyReference() {
  const [yearMonth] = useState(getCurrentYearMonth());
  const [salary, setSalary] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonthlyReference(yearMonth)
      .then((res) => {
        setSalary(res.data.salary);
        setNotes(res.data.notes || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [yearMonth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await upsertMonthlyReference(yearMonth, { salary, notes: notes || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <PageContainer title="Referencia Mensal">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <p className="text-sm text-gray-500 mb-4">
          Configure o salario de referencia para <strong>{formatYearMonth(yearMonth)}</strong>.
          Este valor sera usado para calcular os indicadores do dashboard.
        </p>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salario (R$)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={2}
                placeholder="Ex: Salario + vale alimentacao"
              />
            </div>

            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Salvar
            </button>

            {saved && <p className="text-sm text-success font-medium">Salvo com sucesso!</p>}
          </form>
        )}
      </div>
    </PageContainer>
  );
}
