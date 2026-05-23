import React from 'react';
import { useNavigate } from 'react-router-dom';

function ManagerSidebar({ active = 'dashboard', className = '' }) {
  const navigate = useNavigate();

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', path: '/manager' },
    { key: 'events', label: 'Events', icon: '📅', path: '/manager/events' },
    { key: 'staff', label: 'Staff', icon: '👥', path: '/manager/staff' },
    { key: 'inventory', label: 'Inventory', icon: '📦', path: '/manager/inventory' },
    { key: 'payments', label: 'Payments', icon: '💰', path: '/manager/payments' },
  ];

  const itemClass = (key) => {
    if (active === key) {
      return 'flex items-center gap-3 rounded-lg bg-[#7311d4] px-3 py-2.5 text-white shadow-lg shadow-[#7311d4]/20';
    }

    return 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 transition-colors hover:bg-[#7311d4]/10 dark:text-slate-400';
  };

  return (
    <>
      <aside className={`hidden w-64 flex-shrink-0 flex-col border-r border-[#7311d4]/20 bg-[#f7f6f8] p-4 dark:bg-[#191022] lg:flex ${className}`}>
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#7311d4] text-white">
            <span className="text-2xl">🎪</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-slate-900 dark:text-slate-100">Event Manager</h1>
            <p className="text-xs font-medium text-[#7311d4]">Admin Dashboard</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => navigate(item.path)} className={itemClass(item.key)}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#7311d4]/10 pt-4">
          <button
            onClick={() => {
              localStorage.removeItem('eventAuthUser');
              navigate('/');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-slate-400"
          >
            <span className="text-xl">🚪</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <div className="w-full border-b border-[#7311d4]/15 bg-[#f7f6f8]/95 px-4 py-3 backdrop-blur dark:bg-[#191022]/95 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate('/manager')} className="flex items-center gap-3 text-left">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#7311d4] text-white">
              <span className="text-2xl">🎪</span>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">Event Manager</h1>
              <p className="text-[11px] font-medium text-[#7311d4]">Admin Dashboard</p>
            </div>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('eventAuthUser');
              navigate('/');
            }}
            className="rounded-full border border-[#7311d4]/15 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-red-500/10 hover:text-red-500 dark:bg-white/5 dark:text-slate-200"
          >
            Logout
          </button>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition ${active === item.key ? 'border-[#7311d4] bg-[#7311d4] text-white' : 'border-[#7311d4]/10 bg-white/80 text-slate-600 hover:bg-[#7311d4]/10 dark:bg-white/5 dark:text-slate-300'}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

export default ManagerSidebar;
