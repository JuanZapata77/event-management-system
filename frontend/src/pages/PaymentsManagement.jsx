import React, { useEffect, useState } from 'react';
import ManagerSidebar from '../components/ManagerSidebar';

function PaymentsManagement() {
  const [payments, setPayments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [events, setEvents] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    user_id: '',
    event_id: '',
    amount: '',
    payment_date: '',
    status: 'pending',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, usersRes, eventsRes, assignmentsRes] = await Promise.all([
        fetch('http://localhost:5000/api/payments'),
        fetch('http://localhost:5000/api/users'),
        fetch('http://localhost:5000/api/events'),
        fetch('http://localhost:5000/api/staff-assignments'),
      ]);

      const paymentsData = await paymentsRes.json();
      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();
      const assignmentsData = await assignmentsRes.json();

      setPayments(paymentsData);
      setWorkers(usersData.filter((user) => user.role === 'worker'));
      setEvents(eventsData);
      setStaffAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching payments data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'user_id' ? { event_id: '' } : {}),
    }));
  };

  const isEventDone = (eventItem) => {
    if (!eventItem) return false;

    if (eventItem.status === 'completed') {
      return true;
    }

    if (!eventItem.event_date || !eventItem.end_time) {
      return false;
    }

    const eventEnd = new Date(`${eventItem.event_date}T${eventItem.end_time}`);
    if (Number.isNaN(eventEnd.getTime())) {
      return false;
    }

    return eventEnd < new Date();
  };

  const selectedWorkerId = Number(formData.user_id || 0);

  const eligibleEvents = selectedWorkerId
    ? events.filter((eventItem) => {
        const workedConfirmed = staffAssignments.some(
          (assignment) =>
            assignment.user_id === selectedWorkerId
            && assignment.event_id === eventItem.id
            && assignment.confirmation_status === 'confirmed'
        );

        if (!workedConfirmed) {
          return false;
        }

        const alreadyPaid = payments.some(
          (payment) => Number(payment.user_id) === selectedWorkerId && Number(payment.event_id) === Number(eventItem.id)
        );

        if (alreadyPaid) {
          return false;
        }

        return isEventDone(eventItem);
      })
    : [];

  const resetForm = () => {
    setFormData({
      user_id: '',
      event_id: '',
      amount: '',
      payment_date: '',
      status: 'pending',
      notes: '',
    });
    setFormError('');
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        user_id: Number(formData.user_id),
        event_id: Number(formData.event_id),
        amount: Number(formData.amount),
        payment_date: formData.payment_date || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      const selectedEvent = events.find((eventItem) => Number(eventItem.id) === payload.event_id);
      if (!selectedEvent || !isEventDone(selectedEvent)) {
        throw new Error('Payment can only be created after the event is completed.');
      }

      const workerConfirmedOnEvent = staffAssignments.some(
        (assignment) =>
          assignment.user_id === payload.user_id
          && assignment.event_id === payload.event_id
          && assignment.confirmation_status === 'confirmed'
      );

      if (!workerConfirmedOnEvent) {
        throw new Error('Selected worker does not have a confirmed assignment for this event.');
      }

      const duplicatePayment = payments.some(
        (payment) => Number(payment.user_id) === payload.user_id && Number(payment.event_id) === payload.event_id
      );

      if (duplicatePayment) {
        throw new Error('A payment for this worker and event already exists.');
      }

      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to create payment');
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

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <ManagerSidebar active="payments" />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Payments Management</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Track and create worker payments linked to events.</p>
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
                {showCreateForm ? 'Close Form' : 'Add Payment'}
              </button>
              <div className="px-4 py-2 rounded-lg bg-[#7311d4]/10 text-[#7311d4] font-semibold">
                Total Payments: {payments.length}
              </div>
            </div>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreatePayment} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#2a1b3d]/30 rounded-xl border border-[#7311d4]/10 p-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Worker</span>
                <select name="user_id" value={formData.user_id} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100">
                  <option value="">Select worker</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Event</span>
                <select name="event_id" value={formData.event_id} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" disabled={!formData.user_id}>
                  <option value="">Select event</option>
                  {eligibleEvents.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>{eventItem.event_name}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formData.user_id
                    ? 'Only completed events where this worker was confirmed are shown.'
                    : 'Select a worker first.'}
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Amount</span>
                <input type="number" min="0" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Payment Date</span>
                <input type="date" name="payment_date" value={formData.payment_date} onChange={handleInputChange} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Status</span>
                <select name="status" value={formData.status} onChange={handleInputChange} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">Notes</span>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>

              {formError ? <p className="md:col-span-2 text-sm text-red-500">{formError}</p> : null}

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#7311d4] text-white font-semibold disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Payment'}
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
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Event</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7311d4]/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading payments...</td>
                    </tr>
                  ) : payments.length > 0 ? (
                    payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-[#7311d4]/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{payment.worker_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{payment.event_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">${Number(payment.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-500'}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No payments found.</td>
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

export default PaymentsManagement;
