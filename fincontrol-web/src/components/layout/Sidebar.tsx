import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transacoes', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/monthly-reference', label: 'Referencia Mensal', icon: Settings },
];

export default function Sidebar() {
  const { userName, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-primary">FinControl</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{userName}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 w-full transition-colors"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          {dark ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-danger rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 w-full transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
