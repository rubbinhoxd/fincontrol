import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import CardVisual from '../components/cards/CardVisual';
import { listCards, getCardCycles, createCard, updateCard, deleteCard } from '../api/cards';
import type { CardCycle, Card as CardType, CardRequest } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';
import { CARD_BRANDS } from '../utils/cardBrands';

const emptyForm = (): CardRequest => ({
  name: '',
  color: '#6366F1',
  brand: 'custom',
  closingDay: 10,
  dueDay: 18,
  creditLimit: 0,
  shared: false,
});

export default function Cards() {
  const [cycles, setCycles] = useState<CardCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CardRequest>(emptyForm());
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    getCardCycles().then((res) => setCycles(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const handleEdit = async (cardId: string) => {
    const all = await listCards();
    const card = all.data.find((c: CardType) => c.id === cardId);
    if (!card) return;
    setEditId(card.id);
    setForm({
      name: card.name,
      color: card.color ?? '#6366F1',
      brand: card.brand ?? 'custom',
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      creditLimit: card.creditLimit,
      shared: card.shared,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja desativar este cartao? Transacoes existentes nao sao afetadas.')) return;
    await deleteCard(id);
    load();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...form, brand: form.brand === 'custom' ? null : form.brand };
    if (editId) {
      await updateCard(editId, payload);
    } else {
      await createCard(payload);
    }
    resetForm();
    load();
  };

  return (
    <PageContainer
      title="Cartoes"
      action={
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          Novo cartao
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
          <h3 className="font-semibold dark:text-gray-100 mb-4">{editId ? 'Editar cartao' : 'Novo cartao'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome (apelido)</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required maxLength={60} placeholder="Ex: BB Principal" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de cartao</label>
                <select value={form.brand ?? 'custom'} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input">
                  {CARD_BRANDS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>

              {form.brand === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor personalizada</label>
                  <input type="color" value={form.color ?? '#6366F1'} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-10 rounded cursor-pointer" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia fechamento</label>
                  <input type="number" min="1" max="31" value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: parseInt(e.target.value) || 1 })} className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia vencimento</label>
                  <input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: parseInt(e.target.value) || 1 })} className="input" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limite (R$)</label>
                <input type="number" step="0.01" min="0.01" value={form.creditLimit || ''} onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} className="input" required />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                Cartao compartilhado com parceiro(a)
                <span className="text-xs text-gray-400">— transacoes podem ser divididas 50/50</span>
              </label>

              <div className="flex gap-3">
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark">{editId ? 'Salvar' : 'Criar'}</button>
                <button type="button" onClick={resetForm} className="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">Cancelar</button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</p>
              <CardVisual
                name={form.name || 'Apelido do cartao'}
                brand={form.brand}
                color={form.color}
                creditLimit={form.creditLimit}
              />
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum cartao cadastrado. Adicione o primeiro!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cycles.map((c) => (
            <CardCycleItem
              key={c.id}
              cycle={c}
              onOpen={() => navigate(`/cards/${c.id}`)}
              onEdit={() => handleEdit(c.id)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function CardCycleItem({ cycle, onOpen, onEdit, onDelete }: {
  cycle: CardCycle; onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <button onClick={onOpen} className="block w-full text-left">
        <CardVisual
          name={cycle.name}
          brand={cycle.brand}
          color={cycle.color}
          creditLimit={cycle.creditLimit}
          totalSpent={cycle.totalSpent}
          size="md"
        />
      </button>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
        {cycle.shared && (
          <div className="flex items-center justify-between mb-3 p-2 rounded bg-primary/5">
            <div>
              <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Sua parte</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(cycle.myShare)}</p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wide">Compartilhado</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">% do limite</p>
            <p className="font-semibold dark:text-gray-100">{formatPercent(cycle.percentOfLimit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">% do salario</p>
            <p className="font-semibold dark:text-gray-100">{formatPercent(cycle.percentOfSalary)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fecha em</p>
            <p className="font-semibold dark:text-gray-100">{cycle.daysUntilClosing} dia{cycle.daysUntilClosing === 1 ? '' : 's'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Transacoes</p>
            <p className="font-semibold dark:text-gray-100">{cycle.transactionCount}</p>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-3">
          Ciclo: {formatDate(cycle.cycleStart)} a {formatDate(cycle.cycleEnd)} (limite {formatCurrency(cycle.creditLimit)})
        </div>
        <div className="flex justify-end gap-1 mt-3">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
