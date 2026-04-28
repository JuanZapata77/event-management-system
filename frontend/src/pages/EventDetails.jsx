import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagerSidebar from '../components/ManagerSidebar';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [confirmedWorkers, setConfirmedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [removingAssignmentId, setRemovingAssignmentId] = useState(null);
  const [error, setError] = useState('');
  const [workersError, setWorkersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  useEffect(() => {
    const fetchConfirmedWorkers = async () => {
      try {
        setWorkersLoading(true);
        setWorkersError('');

        const response = await fetch(`http://localhost:5000/api/staff-assignments/event/${id}`);

        if (!response.ok) {
          throw new Error('Could not load confirmed workers');
        }

        const data = await response.json();
        const confirmed = data.filter((assignment) => assignment.confirmation_status === 'confirmed');
        setConfirmedWorkers(confirmed);
      } catch (err) {
        setWorkersError(err.message || 'Unexpected error while loading workers');
      } finally {
        setWorkersLoading(false);
      }
    };

    fetchConfirmedWorkers();
  }, [id]);

  const handleRemoveWorker = async (assignmentId) => {
    try {
      const shouldRemove = window.confirm('Remove this worker from the event?');
      if (!shouldRemove) {
        return;
      }

      setSuccessMessage('');
      setWorkersError('');
      setRemovingAssignmentId(assignmentId);

      const response = await fetch(`http://localhost:5000/api/staff-assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to remove worker');
      }

      setConfirmedWorkers((previous) => previous.filter((assignment) => assignment.id !== assignmentId));
      setSuccessMessage('Worker removed from event successfully.');
    } catch (err) {
      setWorkersError(err.message || 'Unexpected error while removing worker');
    } finally {
      setRemovingAssignmentId(null);
    }
  };

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

          <div className="mt-6 bg-white dark:bg-[#2a1b3d]/40 border border-[#7311d4]/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Confirmed Workers</h2>
              <span className="text-sm font-semibold text-[#7311d4]">{confirmedWorkers.length} confirmed</span>
            </div>

            {successMessage && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            )}

            {workersError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                {workersError}
              </div>
            )}

            {workersLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading confirmed workers...</p>
            ) : confirmedWorkers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No workers confirmed for this event yet.</p>
            ) : (
              <div className="space-y-3">
                {confirmedWorkers.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-[#7311d4]/20 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{assignment.worker_name || 'Unnamed worker'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Role: <span className="capitalize">{assignment.role_for_event}</span>
                        {assignment.phone ? ` • ${assignment.phone}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveWorker(assignment.id)}
                      disabled={removingAssignmentId === assignment.id}
                      className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60"
                    >
                      {removingAssignmentId === assignment.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default EventDetails;
