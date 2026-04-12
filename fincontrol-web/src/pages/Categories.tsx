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
  const [color, setColor] = useState('#6366F1');

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
    setColor('#6366F1');
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#6366F1');
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
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          Nova categoria
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" required maxLength={60} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as TransactionType)} className="input">
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-9 rounded cursor-pointer" />
          </div>
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark">
            {editId ? 'Salvar' : 'Criar'}
          </button>
          <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || '#6B7280' }} />
              <span className="text-sm">{c.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(c)} className="p-1 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
              <button onClick={() => onDelete(c.id)} className="p-1 text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
