import React from 'react';
import { useNavigate } from 'react-router-dom';

function ManagerSidebar({ active = 'dashboard', className = '' }) {
  const navigate = useNavigate();

  const itemClass = (key) => {
    if (active === key) {
      return 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#7311d4] text-white shadow-lg shadow-[#7311d4]/20';
    }

    return 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-[#7311d4]/10 transition-colors';
  };

  return (
    <aside className={`w-64 flex-shrink-0 bg-[#f7f6f8] dark:bg-[#191022] border-r border-[#7311d4]/20 p-4 hidden lg:flex lg:flex-col ${className}`}>
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="size-10 rounded-full bg-[#7311d4] flex items-center justify-center text-white">
          <span className="text-2xl">🎪</span>
        </div>
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-none">Event Manager</h1>
          <p className="text-[#7311d4] text-xs font-medium">Admin Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        <button onClick={() => navigate('/manager')} className={itemClass('dashboard')}>
          <span className="text-xl">📊</span>
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        <button onClick={() => navigate('/manager/events')} className={itemClass('events')}>
          <span className="text-xl">📅</span>
          <span className="text-sm font-medium">Events</span>
        </button>
        <button onClick={() => navigate('/manager/staff')} className={itemClass('staff')}>
          <span className="text-xl">👥</span>
          <span className="text-sm font-medium">Staff</span>
        </button>
        <button onClick={() => navigate('/manager/inventory')} className={itemClass('inventory')}>
          <span className="text-xl">📦</span>
          <span className="text-sm font-medium">Inventory</span>
        </button>
        <button onClick={() => navigate('/manager/payments')} className={itemClass('payments')}>
          <span className="text-xl">💰</span>
          <span className="text-sm font-medium">Payments</span>
        </button>
      </nav>

      <div className="mt-auto pt-4 border-t border-[#7311d4]/10">
        <button onClick={() => navigate('/')} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors">
          <span className="text-xl">🚪</span>
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default ManagerSidebar;
