import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-midnight-canvas)' }}>
      <Sidebar />
      <Outlet />
    </div>
  );
}
