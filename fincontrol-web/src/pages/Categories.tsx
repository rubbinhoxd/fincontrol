import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';
import type { Category, TransactionType } from '../types';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [color, setColor] = useState('#10B981');

  const load = () => {
    setLoading(true);
    listCategories().then((res) => setCategories(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setType('EXPENSE');
    setColor('#10B981');
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#10B981');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja desativar esta categoria?')) return;
    await deleteCategory(id);
    load();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const data = { name, type, color };
    if (editId) {
      await updateCategory(editId, data);
    } else {
      await createCategory(data);
    }
    resetForm();
    load();
  };

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  return (
    <PageContainer
      title="Categorias"
      action={
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus size={16} />
          Nova categoria
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleSubmit} className="card-neo mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="label-meta block mb-2">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" required maxLength={60} />
          </div>
          <div>
            <label className="label-meta block mb-2">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="EXPENSE" style={{ backgroundColor: '#061e1a' }}>Despesa</option>
              <option value="INCOME" style={{ backgroundColor: '#061e1a' }}>Receita</option>
            </select>
          </div>
          <div>
            <label className="label-meta block mb-2">Cor</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--color-steel-border)', backgroundColor: 'transparent' }}
            />
          </div>
          <button type="submit" className="btn-primary">{editId ? 'Salvar' : 'Criar'}</button>
          <button type="button" onClick={resetForm} className="btn-ghost">Cancelar</button>
        </form>
      )}

      {loading ? (
        <div className="card-neo text-center py-16" style={{ color: 'var(--color-mist)' }}>Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CategoryList title="Despesas" categories={expenseCategories} onEdit={handleEdit} onDelete={handleDelete} />
          <CategoryList title="Receitas" categories={incomeCategories} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}
    </PageContainer>
  );
}

function CategoryList({ title, categories, onEdit, onDelete }: {
  title: string; categories: Category[]; onEdit: (c: Category) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="card-neo">
      <h3
        className="mb-4"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          color: 'var(--color-paper-white)',
          fontSize: 18,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      <div className="space-y-1">
        {categories.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--color-mist)' }}>Nenhuma categoria.</p>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 4%, transparent)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#6B7280' }} />
                <span className="text-sm" style={{ color: 'var(--color-paper-white)' }}>{c.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <IconButton onClick={() => onEdit(c)} icon={<Pencil size={14} />} hoverColor="signal" />
                <IconButton onClick={() => onDelete(c.id)} icon={<Trash2 size={14} />} hoverColor="danger" />
              </div>
            </div>
          ))
        )}
      </div>
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
