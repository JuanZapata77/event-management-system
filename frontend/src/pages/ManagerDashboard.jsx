import React, { useState, useEffect } from 'react';
import ManagerSidebar from '../components/ManagerSidebar';
import { API_BASE_URL } from '../config';

function ManagerDashboard() {
  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('eventAuthUser');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const [stats, setStats] = useState({
    totalEvents: 0,
    totalStaff: 0,
    lowStockItems: 0,
    upcomingEvents: []
  });
  const [assignments, setAssignments] = useState([]);
  const [lowStockInventory, setLowStockInventory] = useState([]);
  const [topWorkers, setTopWorkers] = useState([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const [mfaSetupError, setMfaSetupError] = useState('');
  const [mfaSetupResult, setMfaSetupResult] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isMfaEnabled = currentUser?.mfa_enabled === true;

  const fetchDashboardData = async () => {
    try {
      const [eventsRes, usersRes, inventoryRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/events`),
        fetch(`${API_BASE_URL}/api/users`),
        fetch(`${API_BASE_URL}/api/inventory-items`),
        fetch(`${API_BASE_URL}/api/staff-assignments`)
      ]);

      const events = await eventsRes.json();
      const users = await usersRes.json();
      const inventory = await inventoryRes.json();
      const allAssignments = await assignmentsRes.json();
      const workers = users.filter(u => u.role === 'worker');

      setAssignments(allAssignments);

      const today = new Date();
      const upcomingEvents = events
        .filter(event => new Date(event.event_date) >= today && event.status !== 'completed')
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 3);

      const lowStock = inventory.filter(
        item => item.quantity_available <= item.minimum_threshold
      );

      const workerPerformance = workers
        .map((worker) => {
          const confirmedAssignments = allAssignments.filter(
            (assignment) => assignment.user_id === worker.id && assignment.confirmation_status === 'confirmed'
          );

          const roleCounts = confirmedAssignments.reduce((accumulator, assignment) => {
            const role = assignment.role_for_event || 'worker';
            accumulator[role] = (accumulator[role] || 0) + 1;
            return accumulator;
          }, {});

          const primaryRole = Object.keys(roleCounts).length
            ? Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0][0]
            : 'worker';

          return {
            id: worker.id,
            name: worker.name || 'Unnamed worker',
            hourlyRate: worker.hourly_rate,
            confirmedCount: confirmedAssignments.length,
            primaryRole,
          };
        })
        .sort((a, b) => {
          if (b.confirmedCount !== a.confirmedCount) {
            return b.confirmedCount - a.confirmedCount;
          }

          return a.name.localeCompare(b.name);
        })
        .slice(0, 3);

      setTopWorkers(workerPerformance);

      setLowStockInventory(lowStock.slice(0, 3));

      setStats({
        totalEvents: events.length,
        totalStaff: workers.length,
        lowStockItems: lowStock.length,
        upcomingEvents
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleEnable2FA = async (event) => {
    event.preventDefault();

    try {
      setMfaSetupLoading(true);
      setMfaSetupError('');
      setMfaSetupResult(null);

      const response = await fetch(`${API_BASE_URL}/api/auth/manager-2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser?.id,
          password: mfaPassword,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to enable two-factor authentication');
      }

      const updatedUser = { ...currentUser, mfa_enabled: true };
      localStorage.setItem('eventAuthUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setMfaSetupResult(payload);
      setMfaPassword('');
    } catch (error) {
      setMfaSetupError(error.message || 'Unexpected error while enabling two-factor authentication');
    } finally {
      setMfaSetupLoading(false);
    }
  };

  const getCapacityInfo = (eventId, role) => {
    const confirmed = assignments.filter(a => 
      a.event_id === eventId && 
      a.role_for_event === role && 
      a.confirmation_status === 'confirmed'
    ).length;
    return confirmed;
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-[#7311d4]/20 bg-[#f7f6f8] dark:bg-[#191022] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="text-[#7311d4] size-8 flex items-center justify-center">
            <span className="text-4xl">🎪</span>
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em]">EventManager Pro</h2>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <label className="flex flex-col min-w-40 h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-200 dark:bg-[#7311d4]/10 border border-transparent focus-within:border-[#7311d4]/50">
              <div className="text-slate-500 dark:text-[#7311d4]/70 flex items-center justify-center pl-4">
                <span>🔍</span>
              </div>
              <input 
                className="flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-[#7311d4]/50 px-2 text-base font-normal" 
                placeholder="Search data..." 
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-200 dark:bg-[#7311d4]/20 text-slate-700 dark:text-slate-100 hover:bg-[#7311d4]/30 transition-colors">
              <span>🔔</span>
            </button>
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-200 dark:bg-[#7311d4]/20 text-slate-700 dark:text-slate-100 hover:bg-[#7311d4]/30 transition-colors">
              <span>⚙️</span>
            </button>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#7311d4] to-purple-400 border-2 border-[#7311d4]/20"></div>
        </div>
      </header>

      <div className="flex flex-1">
        <ManagerSidebar active="dashboard" className="sticky top-[65px] h-[calc(100vh-65px)]" />

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-8 gap-8">
          {/* Header Section */}
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-black leading-tight tracking-tight">Manager Dashboard</h1>
              <p className="text-slate-600 dark:text-[#7311d4]/60 text-base font-normal">Real-time overview of event operations and logistics.</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#7311d4]/10 border border-slate-200 dark:border-[#7311d4]/20 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-[#7311d4]/10 dark:bg-[#7311d4]/30 text-[#7311d4]">
                  <span>📅</span>
                </div>
                <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                  <span>📈</span> +12%
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-[#7311d4]/60 text-sm font-medium">Total Events</p>
                <p className="text-slate-900 dark:text-slate-100 text-3xl font-bold tracking-tight">{stats.totalEvents}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#7311d4]/10 border border-slate-200 dark:border-[#7311d4]/20 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/30 text-blue-500">
                  <span>👥</span>
                </div>
                <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                  <span>📈</span> +5%
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-[#7311d4]/60 text-sm font-medium">Active Staff</p>
                <p className="text-slate-900 dark:text-slate-100 text-3xl font-bold tracking-tight">{stats.totalStaff}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#7311d4]/10 border border-slate-200 dark:border-[#7311d4]/20 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-orange-500/10 dark:bg-orange-500/30 text-orange-500">
                  <span>⚠️</span>
                </div>
                <span className="text-orange-500 text-sm font-bold flex items-center gap-1">
                  <span>📉</span> -2%
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-[#7311d4]/60 text-sm font-medium">Low Stock Alerts</p>
                <p className="text-slate-900 dark:text-slate-100 text-3xl font-bold tracking-tight">{stats.lowStockItems}</p>
              </div>
            </div>
          </div>

          {/* Upcoming Events Table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold tracking-tight">Upcoming Events</h2>
              <button className="text-[#7311d4] text-sm font-bold hover:underline">View All Schedule</button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#7311d4]/20 bg-white dark:bg-[#7311d4]/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#7311d4]/10">
                    <th className="px-6 py-4 text-slate-500 dark:text-[#7311d4]/60 text-xs font-bold uppercase tracking-wider">Event Details</th>
                    <th className="px-6 py-4 text-slate-500 dark:text-[#7311d4]/60 text-xs font-bold uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-4 text-slate-500 dark:text-[#7311d4]/60 text-xs font-bold uppercase tracking-wider">Caterers Capacity</th>
                    <th className="px-6 py-4 text-slate-500 dark:text-[#7311d4]/60 text-xs font-bold uppercase tracking-wider">Bartenders Capacity</th>
                    <th className="px-6 py-4 text-slate-500 dark:text-[#7311d4]/60 text-xs font-bold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#7311d4]/10">
                  {stats.upcomingEvents.map(event => {
                    const caterersConfirmed = getCapacityInfo(event.id, 'caterer');
                    const bartendersConfirmed = getCapacityInfo(event.id, 'bartender');
                    const caterersPercent = event.caterers_needed > 0 ? Math.round((caterersConfirmed / event.caterers_needed) * 100) : 0;
                    const bartendersPercent = event.bartenders_needed > 0 ? Math.round((bartendersConfirmed / event.bartenders_needed) * 100) : 0;

                    return (
                      <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-[#7311d4]/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-slate-100 font-bold">{event.event_name}</span>
                            <span className="text-slate-500 dark:text-[#7311d4]/50 text-xs">{event.location}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                          {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {event.start_time}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between text-[10px] font-bold dark:text-[#7311d4]/60">
                              <span>{caterersConfirmed}/{event.caterers_needed || 0}</span>
                              <span>{caterersPercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-[#7311d4]/20 rounded-full overflow-hidden">
                              <div className="h-full bg-[#7311d4]" style={{width: `${caterersPercent}%`}}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between text-[10px] font-bold dark:text-[#7311d4]/60">
                              <span>{bartendersConfirmed}/{event.bartenders_needed || 0}</span>
                              <span>{bartendersPercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-[#7311d4]/20 rounded-full overflow-hidden">
                              <div className="h-full bg-[#7311d4]" style={{width: `${bartendersPercent}%`}}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{event.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory Alerts & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-[#7311d4]/20 bg-white dark:bg-[#7311d4]/5 p-6">
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-2">Critical Inventory Alerts</h3>
              <div className="flex flex-col gap-3">
                {lowStockInventory.length > 0 ? lowStockInventory.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-3">
                      <span className="text-orange-500">🍷</span>
                      <span className="text-sm font-medium dark:text-slate-200">{item.item_name}</span>
                    </div>
                    <span className="text-orange-500 text-xs font-bold">{item.quantity_available} left (Min: {item.minimum_threshold})</span>
                  </div>
                )) : (
                  <p className="text-slate-500 dark:text-[#7311d4]/50 text-sm">No low stock items</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-[#7311d4]/20 bg-white dark:bg-[#7311d4]/5 p-6 relative overflow-hidden">
              <div className="flex flex-col gap-1 relative z-10">
                <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg">Quick Staff Overview</h3>
                  <p className="text-slate-500 dark:text-[#7311d4]/50 text-xs">Top workers by confirmed assignments</p>
              </div>
              <div className="flex flex-col gap-4 mt-2 relative z-10">
                  {topWorkers.length > 0 ? (
                    topWorkers.map((worker) => (
                      <div key={worker.id} className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-[#7311d4]/20 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200">
                          {worker.name?.charAt(0)?.toUpperCase() || 'W'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{worker.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-[#7311d4]/50 capitalize">{worker.primaryRole} • {worker.confirmedCount} confirmed events</p>
                        </div>
                        <div className="text-emerald-500 font-bold text-sm">
                          {worker.hourlyRate !== null && worker.hourlyRate !== undefined
                            ? `$${Number(worker.hourlyRate).toFixed(2)}/hr`
                            : 'No rate'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No workers found yet.</p>
                  )}
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <span className="text-[120px] text-[#7311d4]">👥</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#7311d4]/20 bg-white dark:bg-[#7311d4]/5 p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg">Manager Security</h3>
                <p className="text-slate-500 dark:text-[#7311d4]/50 text-sm">Free two-factor authentication using an authenticator app.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isMfaEnabled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                {isMfaEnabled ? '2FA Enabled' : '2FA Not Enabled'}
              </span>
            </div>

            {!isMfaEnabled ? (
              <form className="grid gap-4 md:grid-cols-[1fr_auto] items-end" onSubmit={handleEnable2FA}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Confirm your password</span>
                  <input
                    type="password"
                    value={mfaPassword}
                    onChange={(e) => setMfaPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7311d4]"
                    placeholder="Enter password to enable 2FA"
                  />
                </label>
                <button
                  type="submit"
                  disabled={mfaSetupLoading}
                  className="rounded-lg bg-[#7311d4] px-4 py-2.5 font-semibold text-white hover:bg-[#7311d4]/90 disabled:opacity-60"
                >
                  {mfaSetupLoading ? 'Enabling...' : 'Enable 2FA'}
                </button>
              </form>
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">This manager account now requires a one-time code on every login.</p>
            )}

            {mfaSetupError ? <p className="text-sm text-red-600">{mfaSetupError}</p> : null}

            {mfaSetupResult ? (
              <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
                <div className="rounded-xl bg-white p-4 border border-slate-200">
                  <img src={mfaSetupResult.qrCodeDataUrl} alt="2FA QR Code" className="h-56 w-56 object-contain" />
                </div>
                <div className="space-y-3">
                  <p className="text-slate-700 dark:text-slate-200 text-sm">Scan this QR code with Microsoft Authenticator, Authy, or Google Authenticator. If needed, manually enter this secret:</p>
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-[#7311d4]/20 p-3 text-sm font-mono break-all text-slate-800 dark:text-slate-200">
                    {mfaSetupResult.secret}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">After scanning, use the 6-digit code from your app when signing in as manager.</p>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ManagerDashboard;