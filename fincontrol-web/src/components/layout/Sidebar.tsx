import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, Settings, LogOut, FlaskConical, CreditCard, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getWhatsAppStatus } from '../../api/whatsapp';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/whatsapp', label: 'Assistente WhatsApp', icon: MessageCircle, badge: 'novo' },
  { to: '/cards', label: 'Cartões', icon: CreditCard },
  { to: '/simulations', label: 'Simulações', icon: FlaskConical },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/monthly-reference', label: 'Referência Mensal', icon: Settings },
];

export default function Sidebar() {
  const { userName, logout } = useAuth();
  const [whatsAppActive, setWhatsAppActive] = useState<boolean | null>(null);

  useEffect(() => {
    getWhatsAppStatus()
      .then((res) => setWhatsAppActive(res.data.status === 'ACTIVE'))
      .catch(() => setWhatsAppActive(false));
  }, []);

  return (
    <aside
      className="w-64 flex flex-col min-h-screen"
      style={{
        backgroundColor: 'var(--color-deep-surface)',
        borderRight: '1px solid var(--color-steel-border)',
      }}
    >
      {/* Header: logo + nome do user */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--color-steel-border)' }}>
        <div className="flex items-center gap-3 mb-2">
          <img src="/favicon.png" alt="Savey" className="w-9 h-9 rounded-xl" />
          <h1
            className="text-xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-paper-white)',
            }}
          >
            Savey
          </h1>
        </div>
        <p
          className="text-xs"
          style={{ color: 'var(--color-mist)', fontWeight: 400, letterSpacing: '0.02em' }}
        >
          {userName}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, badge }) => {
          const showBadge = badge === 'novo' && whatsAppActive === false;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive ? 'nav-link-active' : 'nav-link'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'color-mix(in oklab, var(--color-signal) 15%, transparent)',
                      color: 'var(--color-signal)',
                      fontWeight: 500,
                    }
                  : {
                      color: 'var(--color-fog)',
                      fontWeight: 400,
                    }
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ backgroundColor: 'var(--color-signal)', color: 'var(--color-paper-white)' }}
                >
                  Novo
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: só sair (dark-only, sem toggle) */}
      <div className="p-3" style={{ borderTop: '1px solid var(--color-steel-border)' }}>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-colors hover:opacity-80"
          style={{ color: 'var(--color-mist)', fontWeight: 400 }}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
