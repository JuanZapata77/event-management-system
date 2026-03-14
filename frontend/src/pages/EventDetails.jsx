import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagerSidebar from '../components/ManagerSidebar';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/events/${id}`);

        if (!response.ok) {
          throw new Error('Could not load event details');
        }

        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError(err.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#f7f6f8] dark:bg-[#191022] p-8 text-slate-700 dark:text-slate-200">Loading event...</div>;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#f7f6f8] dark:bg-[#191022] p-8">
        <p className="text-red-500 mb-4">{error || 'Event not found'}</p>
        <button
          onClick={() => navigate('/manager/events')}
          className="px-4 py-2 rounded-lg bg-[#7311d4] text-white"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <ManagerSidebar active="events" />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">{event.event_name}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/manager/events/${event.id}/edit`)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-[#2a1b3d] text-slate-900 dark:text-slate-100"
              >
                Edit
              </button>
              <button
                onClick={() => navigate('/manager/events')}
                className="px-4 py-2 rounded-lg bg-[#7311d4] text-white"
              >
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#2a1b3d]/40 border border-[#7311d4]/10 rounded-xl p-6">
            <div>
              <p className="text-xs uppercase text-slate-500">Type</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.event_type}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Status</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Date</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{new Date(event.event_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Time</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.start_time} - {event.end_time}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Location</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.location}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Guest Count</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.guest_count}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Caterers Needed</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.caterers_needed || 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Bartenders Needed</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{event.bartenders_needed || 0}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase text-slate-500">Notes</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{event.notes || 'No notes yet.'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EventDetails;
