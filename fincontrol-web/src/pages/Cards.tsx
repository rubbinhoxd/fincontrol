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
  color: '#10B981',
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
      color: card.color ?? '#10B981',
      brand: card.brand ?? 'custom',
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      creditLimit: card.creditLimit,
      shared: card.shared,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja desativar este cartão? Transações existentes não são afetadas.')) return;
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
      title="Cartões"
      action={
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus size={16} />
          Novo cartão
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleSubmit} className="card-neo mb-6">
          <h3 className="label-meta mb-4" style={{ fontSize: 13 }}>{editId ? 'Editar cartão' : 'Novo cartão'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label-meta block mb-2">Nome (apelido)</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required maxLength={60} placeholder="Ex: BB Principal" />
              </div>

              <div>
                <label className="label-meta block mb-2">Tipo de cartão</label>
                <select
                  value={form.brand ?? 'custom'}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="input"
                  style={{ cursor: 'pointer' }}
                >
                  {CARD_BRANDS.map((b) => (
                    <option key={b.id} value={b.id} style={{ backgroundColor: '#061e1a' }}>{b.label}</option>
                  ))}
                </select>
              </div>

              {form.brand === 'custom' && (
                <div>
                  <label className="label-meta block mb-2">Cor personalizada</label>
                  <input
                    type="color"
                    value={form.color ?? '#10B981'}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-14 h-10 rounded-lg cursor-pointer"
                    style={{ border: '1px solid var(--color-steel-border)', backgroundColor: 'transparent' }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-meta block mb-2">Dia fechamento</label>
                  <input type="number" min="1" max="31" value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: parseInt(e.target.value) || 1 })} className="input" required />
                </div>
                <div>
                  <label className="label-meta block mb-2">Dia vencimento</label>
                  <input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: parseInt(e.target.value) || 1 })} className="input" required />
                </div>
              </div>

              <div>
                <label className="label-meta block mb-2">Limite (R$)</label>
                <input type="number" step="0.01" min="0.01" value={form.creditLimit || ''} onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} className="input" required />
              </div>

              <label
                className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2.5 rounded-xl"
                style={{
                  backgroundColor: form.shared ? 'color-mix(in oklab, var(--color-signal) 12%, transparent)' : 'var(--color-midnight-canvas)',
                  border: form.shared
                    ? '1px solid color-mix(in oklab, var(--color-signal) 45%, transparent)'
                    : '1px solid var(--color-steel-border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.shared}
                  onChange={(e) => setForm({ ...form, shared: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span style={{ color: form.shared ? 'var(--color-signal)' : 'var(--color-fog)' }}>
                  Cartão compartilhado com parceiro(a)
                </span>
                <span className="text-xs" style={{ color: 'var(--color-mist)' }}>— transações podem ser divididas 50/50</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">{editId ? 'Salvar' : 'Criar'}</button>
                <button type="button" onClick={resetForm} className="btn-ghost">Cancelar</button>
              </div>
            </div>

            <div>
              <p className="label-meta mb-3">Preview</p>
              <CardVisual
                name={form.name || 'Apelido do cartão'}
                brand={form.brand}
                color={form.color}
                creditLimit={form.creditLimit}
              />
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card-neo text-center py-16" style={{ color: 'var(--color-mist)' }}>Carregando...</div>
      ) : cycles.length === 0 ? (
        <div className="card-neo text-center py-16" style={{ color: 'var(--color-mist)' }}>
          Nenhum cartão cadastrado. Adicione o primeiro!
        </div>
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
      <div className="card-neo" style={{ padding: 20 }}>
        {cycle.shared && (
          <div
            className="flex items-center justify-between mb-3 p-3 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-signal) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--color-signal) 25%, transparent)',
            }}
          >
            <div>
              <p className="label-meta">Sua parte</p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: 18,
                  color: 'var(--color-signal)',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatCurrency(cycle.myShare)}
              </p>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                backgroundColor: 'color-mix(in oklab, var(--color-signal) 20%, transparent)',
                color: 'var(--color-signal)',
              }}
            >
              Compartilhado
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="% do limite" value={formatPercent(cycle.percentOfLimit)} />
          <Stat label="% do salário" value={formatPercent(cycle.percentOfSalary)} />
          <Stat label="Fecha em" value={`${cycle.daysUntilClosing} dia${cycle.daysUntilClosing === 1 ? '' : 's'}`} />
          <Stat label="Transações" value={String(cycle.transactionCount)} />
        </div>
        <div className="text-xs mt-3" style={{ color: 'var(--color-mist)' }}>
          Ciclo: {formatDate(cycle.cycleStart)} a {formatDate(cycle.cycleEnd)} (limite {formatCurrency(cycle.creditLimit)})
        </div>
        <div className="flex justify-end gap-1 mt-3">
          <IconButton onClick={onEdit} icon={<Pencil size={14} />} hoverColor="signal" />
          <IconButton onClick={onDelete} icon={<Trash2 size={14} />} hoverColor="danger" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p style={{ color: 'var(--color-paper-white)', fontWeight: 500, fontSize: 14 }}>{value}</p>
    </div>
  );
}

function IconButton({ onClick, icon, hoverColor }: { onClick: () => void; icon: React.ReactNode; hoverColor: 'signal' | 'danger' }) {
  const color = hoverColor === 'signal' ? 'var(--color-signal)' : 'var(--color-danger)';
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: 'var(--color-mist)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = color;
        e.currentTarget.style.backgroundColor = `color-mix(in oklab, ${color} 10%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-mist)';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
