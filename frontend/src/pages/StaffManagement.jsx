import React, { useEffect, useState } from 'react';
import ManagerSidebar from '../components/ManagerSidebar';

function StaffManagement() {
  const [workers, setWorkers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hourly_rate: '',
    password: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const [usersRes, assignmentsRes] = await Promise.all([
        fetch('http://localhost:5000/api/users'),
        fetch('http://localhost:5000/api/staff-assignments'),
      ]);

      const usersData = await usersRes.json();
      const assignmentsData = await assignmentsRes.json();

      setWorkers(usersData.filter((user) => user.role === 'worker'));
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      hourly_rate: '',
      password: '',
    });
    setFormError('');
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
        password_hash: formData.password,
        role: 'worker',
      };

      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to create staff member');
      }

      await fetchData();
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      setFormError(error.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  const getWorkerStats = (workerId) => {
    const workerAssignments = assignments.filter((assignment) => assignment.user_id === workerId);
    const confirmed = workerAssignments.filter((assignment) => assignment.confirmation_status === 'confirmed').length;
    const pending = workerAssignments.filter((assignment) => assignment.confirmation_status === 'pending').length;

    return {
      total: workerAssignments.length,
      confirmed,
      pending,
    };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <ManagerSidebar active="staff" />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Staff Management</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Overview of all company workers and their assignments.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (showCreateForm) {
                    resetForm();
                  }
                  setShowCreateForm(!showCreateForm);
                }}
                className="px-4 py-2 rounded-lg bg-[#7311d4] text-white font-semibold hover:bg-[#7311d4]/90 transition-colors"
              >
                {showCreateForm ? 'Close Form' : 'Add Staff Member'}
              </button>
              <div className="px-4 py-2 rounded-lg bg-[#7311d4]/10 text-[#7311d4] font-semibold">
                Total Workers: {workers.length}
              </div>
            </div>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateStaff} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#2a1b3d]/30 rounded-xl border border-[#7311d4]/10 p-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Name</span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Email</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Phone</span>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Hourly Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">Password</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100"
                />
              </label>

              {formError ? <p className="md:col-span-2 text-sm text-red-500">{formError}</p> : null}

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#7311d4] text-white font-semibold disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          ) : null}

          <div className="bg-white dark:bg-[#2a1b3d]/30 rounded-xl border border-[#7311d4]/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#2a1b3d]/50 border-b border-[#7311d4]/10">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Worker</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Phone</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Rate</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Assignments</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Confirmed</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7311d4]/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading staff...</td>
                    </tr>
                  ) : workers.length > 0 ? (
                    workers.map((worker) => {
                      const stats = getWorkerStats(worker.id);

                      return (
                        <tr key={worker.id} className="hover:bg-[#7311d4]/5 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{worker.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{worker.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{worker.phone || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{worker.hourly_rate ? `$${Number(worker.hourly_rate).toFixed(2)}/hr` : '-'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{stats.total}</td>
                          <td className="px-6 py-4 text-sm font-medium text-emerald-600">{stats.confirmed}</td>
                          <td className="px-6 py-4 text-sm font-medium text-orange-500">{stats.pending}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No workers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StaffManagement;
