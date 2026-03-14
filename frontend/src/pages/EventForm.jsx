import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagerSidebar from '../components/ManagerSidebar';

const initialForm = {
  event_name: '',
  event_type: 'wedding',
  event_date: '',
  start_time: '',
  end_time: '',
  guest_count: '',
  location: '',
  status: 'pending',
  notes: '',
  caterers_needed: '',
  bartenders_needed: '',
};

function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    const fetchEvent = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/events/${id}`);
        if (!response.ok) {
          throw new Error('Could not load event for edit');
        }

        const data = await response.json();
        setFormData({
          event_name: data.event_name || '',
          event_type: data.event_type || 'wedding',
          event_date: data.event_date ? String(data.event_date).slice(0, 10) : '',
          start_time: data.start_time ? String(data.start_time).slice(0, 5) : '',
          end_time: data.end_time ? String(data.end_time).slice(0, 5) : '',
          guest_count: data.guest_count !== null && data.guest_count !== undefined ? String(data.guest_count) : '',
          location: data.location || '',
          status: data.status || 'pending',
          notes: data.notes || '',
          caterers_needed: data.caterers_needed !== null && data.caterers_needed !== undefined ? String(data.caterers_needed) : '',
          bartenders_needed: data.bartenders_needed !== null && data.bartenders_needed !== undefined ? String(data.bartenders_needed) : '',
        });
      } catch (err) {
        setError(err.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        guest_count: Number(formData.guest_count || 0),
        caterers_needed: Number(formData.caterers_needed || 0),
        bartenders_needed: Number(formData.bartenders_needed || 0),
      };

      const response = await fetch(
        isEdit ? `http://localhost:5000/api/events/${id}` : 'http://localhost:5000/api/events',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error || (isEdit ? 'Failed to update event' : 'Failed to create event')
        );
      }

      const savedEvent = await response.json();
      navigate(`/manager/events/${savedEvent.id}`);
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f7f6f8] dark:bg-[#191022] p-8 text-slate-700 dark:text-slate-200">Loading event...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <ManagerSidebar active="events" />
      <main className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {isEdit ? 'Edit Event' : 'Create Event'}
          </h1>
          <button
            onClick={() => navigate('/manager/events')}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-[#2a1b3d] text-slate-900 dark:text-slate-100"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#2a1b3d]/40 border border-[#7311d4]/10 rounded-xl p-6">
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Event name</span>
            <input name="event_name" value={formData.event_name} onChange={handleChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Type</span>
            <select name="event_type" value={formData.event_type} onChange={handleChange} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100">
              <option value="wedding">Wedding</option>
              <option value="corporate">Corporate</option>
              <option value="birthday">Birthday</option>
              <option value="conference">Conference</option>
              <option value="non-profit">Non-profit</option>
              <option value="gala">Gala</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Status</span>
            <select name="status" value={formData.status} onChange={handleChange} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100">
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Date</span>
            <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Guest count</span>
            <input type="number" min="0" name="guest_count" value={formData.guest_count} onChange={handleChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Start time</span>
            <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">End time</span>
            <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Location</span>
            <input name="location" value={formData.location} onChange={handleChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Caterers needed</span>
            <input type="number" min="0" name="caterers_needed" value={formData.caterers_needed} onChange={handleChange} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Bartenders needed</span>
            <input type="number" min="0" name="bartenders_needed" value={formData.bartenders_needed} onChange={handleChange} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Notes</span>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
          </label>

          {error ? <p className="md:col-span-2 text-red-500 text-sm">{error}</p> : null}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-[#7311d4] text-white font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
      </main>
    </div>
  );
}

export default EventForm;
