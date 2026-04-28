import React, { useMemo, useState, useEffect } from 'react';

function WorkerPortal() {
  const [workerId, setWorkerId] = useState(null);
  const [worker, setWorker] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [showLogin, setShowLogin] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isAvailableForShifts, setIsAvailableForShifts] = useState(true);
  const [unavailableFrom, setUnavailableFrom] = useState('');
  const [unavailableTo, setUnavailableTo] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [historyAssignments, setHistoryAssignments] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (workerId) {
      fetchWorkerData();
      fetchAvailableEvents();
      fetchMyAssignments();
      fetchHistory();
    }
  }, [workerId]);

  const getEventEndDateTime = (eventDate, endTime) => {
    if (!eventDate) {
      return null;
    }

    const datePart = String(eventDate).split('T')[0];
    const safeEndTime = endTime || '23:59:59';
    const parsed = new Date(`${datePart}T${safeEndTime}`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isUpcomingEvent = (eventDate, endTime) => {
    const eventEnd = getEventEndDateTime(eventDate, endTime);

    if (!eventEnd) {
      return false;
    }

    return eventEnd >= new Date();
  };

  const calculateAssignmentDurationHours = (assignment) => {
    if (!assignment?.event_date || !assignment?.start_time || !assignment?.end_time) {
      return 0;
    }

    const eventDatePart = String(assignment.event_date).split('T')[0];
    const startDateTime = new Date(`${eventDatePart}T${assignment.start_time}`);
    const endDateTime = new Date(`${eventDatePart}T${assignment.end_time}`);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      return 0;
    }

    let durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);

    if (durationHours < 0) {
      durationHours += 24;
    }

    return Math.max(0, durationHours);
  };

  const calculateAssignmentPayableHours = (assignment) => {
    const backendPayableHours = Number(assignment?.payable_hours);

    if (Number.isFinite(backendPayableHours) && backendPayableHours > 0) {
      return backendPayableHours;
    }

    return calculateAssignmentDurationHours(assignment);
  };

  const calculateAssignmentEarnings = (assignment) => {
    const rate = Number(assignment?.hourly_rate ?? worker?.hourly_rate ?? 0);

    if (!Number.isFinite(rate) || rate <= 0) {
      return 0;
    }

    const backendEstimate = Number(assignment?.estimated_earnings);
    if (Number.isFinite(backendEstimate) && backendEstimate > 0) {
      return backendEstimate;
    }

    const durationHours = calculateAssignmentPayableHours(assignment);
    return Math.max(0, rate * durationHours);
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      const workersList = data.filter(user => user.role === 'worker');
      setWorkers(workersList);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchWorkerData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${workerId}`);
      const data = await response.json();
      setWorker(data);
      setIsAvailableForShifts(data.is_available_for_shifts !== false);
      setUnavailableFrom(data.unavailable_from ? String(data.unavailable_from).split('T')[0] : '');
      setUnavailableTo(data.unavailable_to ? String(data.unavailable_to).split('T')[0] : '');
    } catch (error) {
      console.error('Error fetching worker data:', error);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      const [eventsRes, assignmentsRes] = await Promise.all([
        fetch('http://localhost:5000/api/events'),
        fetch('http://localhost:5000/api/staff-assignments')
      ]);

      const events = await eventsRes.json();
      const assignments = await assignmentsRes.json();

      setAllAssignments(assignments);

      const upcomingEvents = events.filter(
        event =>
          isUpcomingEvent(event.event_date, event.end_time) &&
          event.status !== 'completed' &&
          event.status !== 'cancelled'
      );

      const available = upcomingEvents.filter(event => {
        const confirmedCaterers = assignments.filter(a =>
          a.event_id === event.id &&
          a.role_for_event === 'caterer' &&
          a.confirmation_status === 'confirmed'
        ).length;

        const confirmedBartenders = assignments.filter(a =>
          a.event_id === event.id &&
          a.role_for_event === 'bartender' &&
          a.confirmation_status === 'confirmed'
        ).length;

        const myAssignment = assignments.find(a =>
          a.event_id === event.id && a.user_id === workerId
        );

        const needsCaterers = confirmedCaterers < event.caterers_needed;
        const needsBartenders = confirmedBartenders < event.bartenders_needed;

        const isBothRolesFull = (event.caterers_needed === 0 || confirmedCaterers >= event.caterers_needed) &&
          (event.bartenders_needed === 0 || confirmedBartenders >= event.bartenders_needed);

        if (isBothRolesFull) {
          return false;
        }

        return (needsCaterers || needsBartenders) && (!myAssignment || myAssignment.confirmation_status === 'pending');
      });

      setAvailableEvents(available);
    } catch (error) {
      console.error('Error fetching available events:', error);
    }
  };

  const fetchMyAssignments = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/staff-assignments/user/${workerId}`);
      const data = await response.json();
      setMyAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleLogin = (selectedWorkerId) => {
    setWorkerId(parseInt(selectedWorkerId, 10));
    setShowLogin(false);
    setActiveSection('dashboard');
  };

  const handleConfirm = async (eventId, role) => {
    try {
      setAssignmentError('');
      const existingAssignment = myAssignments.find(a => a.event_id === eventId);

      if (existingAssignment) {
        const response = await fetch(`http://localhost:5000/api/staff-assignments/${existingAssignment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            confirmation_status: 'confirmed',
            hours_worked: existingAssignment.hours_worked,
            role_for_event: role
          })
        });

        if (!response.ok) {
          const errorPayload = await response.json();
          throw new Error(errorPayload.error || 'Unable to confirm assignment');
        }
      } else {
        const response = await fetch('http://localhost:5000/api/staff-assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: eventId,
            user_id: workerId,
            role_for_event: role,
            confirmation_status: 'confirmed'
          })
        });

        if (!response.ok) {
          const errorPayload = await response.json();
          throw new Error(errorPayload.error || 'Unable to confirm assignment');
        }
      }

      fetchAvailableEvents();
      fetchMyAssignments();
    } catch (error) {
      console.error('Error confirming event:', error);
      setAssignmentError(error.message);
    }
  };

  const saveAvailability = async ({
    nextAvailable,
    nextUnavailableFrom,
    nextUnavailableTo,
    successMessage,
  }) => {
    try {
      setIsSavingAvailability(true);
      setAvailabilityMessage('');

      const response = await fetch(`http://localhost:5000/api/users/${workerId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_available_for_shifts: nextAvailable,
          unavailable_from: nextUnavailableFrom || null,
          unavailable_to: nextUnavailableTo || null,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json();
        throw new Error(errorPayload.error || 'Failed to update availability');
      }

      const updatedWorker = await response.json();
      setWorker(updatedWorker);
      setIsAvailableForShifts(updatedWorker.is_available_for_shifts !== false);
      setUnavailableFrom(updatedWorker.unavailable_from ? String(updatedWorker.unavailable_from).split('T')[0] : '');
      setUnavailableTo(updatedWorker.unavailable_to ? String(updatedWorker.unavailable_to).split('T')[0] : '');
      setAvailabilityMessage(successMessage || 'Availability updated successfully.');
      fetchAvailableEvents();
    } catch (error) {
      console.error('Error updating availability:', error);
      setAvailabilityMessage(error.message);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleSaveAvailability = async () => {
    await saveAvailability({
      nextAvailable: isAvailableForShifts,
      nextUnavailableFrom: unavailableFrom,
      nextUnavailableTo: unavailableTo,
      successMessage: 'Availability updated successfully.',
    });
  };

  const handleAvailabilityToggle = async () => {
    const nextValue = !isAvailableForShifts;
    setIsAvailableForShifts(nextValue);

    await saveAvailability({
      nextAvailable: nextValue,
      nextUnavailableFrom: unavailableFrom,
      nextUnavailableTo: unavailableTo,
      successMessage: `Availability set to ${nextValue ? 'available' : 'unavailable'}.`,
    });
  };

  const upcomingConfirmedAssignments = useMemo(
    () => myAssignments.filter(
      assignment =>
        assignment.confirmation_status === 'confirmed' &&
        isUpcomingEvent(assignment.event_date, assignment.end_time)
    ),
    [myAssignments]
  );

  const estimatedUpcomingEarnings = useMemo(() => {
    return upcomingConfirmedAssignments.reduce((total, assignment) => {
      return total + calculateAssignmentEarnings(assignment);
    }, 0);
  }, [upcomingConfirmedAssignments, worker?.hourly_rate]);

  const navItems = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'events', icon: '📅', label: 'Events' },
    { key: 'schedule', icon: '📆', label: 'My Schedule' },
    { key: 'earnings', icon: '💰', label: 'Earnings' },
    { key: 'history', icon: '📜', label: 'History' },
    { key: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/staff-assignments/user/${workerId}/history`);
      const data = await response.json();
      setHistoryAssignments(data.assignments || []);
      setHistoryTotal(Number(data.total_earnings || 0));
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const renderScheduleCards = (items) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.length > 0 ? (
        items.map(assignment => (
          <div key={assignment.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-5 hover:border-[#7311d4]/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-green-500/10 text-green-500 rounded">Confirmed</span>
              <span className="text-sm font-semibold dark:text-slate-300">{new Date(assignment.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <h4 className="font-bold text-lg mb-1 dark:text-white">{assignment.event_name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{assignment.location} | {assignment.start_time} - {assignment.end_time}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#7311d4]/5">
              <span className="text-xs font-medium text-slate-400">Position: {assignment.role_for_event}</span>
              <span className="text-[#7311d4] font-bold">${calculateAssignmentEarnings(assignment).toFixed(2)} Est.</span>
            </div>
          </div>
        ))
      ) : (
        <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-8">No upcoming confirmed shifts.</p>
      )}
    </div>
  );

  const renderAvailableEvents = (items) => (
    <div className="space-y-4">
      {items.length > 0 ? items.map(event => {
        const caterersConfirmed = allAssignments.filter(a =>
          a.event_id === event.id &&
          a.role_for_event === 'caterer' &&
          a.confirmation_status === 'confirmed'
        ).length;

        const bartendersConfirmed = allAssignments.filter(a =>
          a.event_id === event.id &&
          a.role_for_event === 'bartender' &&
          a.confirmation_status === 'confirmed'
        ).length;

        const needsCaterers = event.caterers_needed > 0 && caterersConfirmed < event.caterers_needed;
        const needsBartenders = event.bartenders_needed > 0 && bartendersConfirmed < event.bartenders_needed;

        return (
          <div key={event.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl overflow-hidden flex flex-col md:flex-row items-stretch">
            <div className="w-full md:w-64 h-48 md:h-auto bg-gradient-to-br from-[#7311d4] to-purple-600 flex items-center justify-center">
              <span className="text-6xl">🎉</span>
            </div>
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#7311d4] uppercase tracking-widest">Event Available</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <h4 className="text-xl font-bold mb-2 dark:text-white">{event.event_name}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mb-4">
                  <span>📍</span>
                  {event.location}
                </p>
              </div>
              <div className="space-y-3">
                {needsCaterers && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-[#7311d4]/5">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-3">
                        <span className="text-sm font-medium dark:text-slate-300">🍽️ {caterersConfirmed}/{event.caterers_needed} Caterers</span>
                        <span className="text-xs text-slate-400">{event.caterers_needed - caterersConfirmed} slots left</span>
                      </div>
                      <div className="w-full sm:w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7311d4] rounded-full" style={{ width: `${(caterersConfirmed / event.caterers_needed) * 100}%` }}></div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirm(event.id, 'caterer')}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#7311d4] hover:bg-[#7311d4]/90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Confirm Role
                    </button>
                  </div>
                )}

                {needsBartenders && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-[#7311d4]/5">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-3">
                        <span className="text-sm font-medium dark:text-slate-300">🍹 {bartendersConfirmed}/{event.bartenders_needed} Bartenders</span>
                        <span className="text-xs text-slate-400">{event.bartenders_needed - bartendersConfirmed} slots left</span>
                      </div>
                      <div className="w-full sm:w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7311d4] rounded-full" style={{ width: `${(bartendersConfirmed / event.bartenders_needed) * 100}%` }}></div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirm(event.id, 'bartender')}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#7311d4] hover:bg-[#7311d4]/90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Confirm Role
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }) : (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">No available events at this time</p>
      )}
    </div>
  );

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#7311d4] to-purple-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Worker Portal Login</h2>
          <p className="text-gray-600 mb-6">Select your name to continue:</p>
          <select
            onChange={(e) => handleLogin(e.target.value)}
            defaultValue=""
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#7311d4] transition-colors"
          >
            <option value="" disabled>Choose your name...</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <aside className="w-64 flex-shrink-0 bg-slate-100 dark:bg-slate-900/50 border-r border-slate-200 dark:border-[#7311d4]/20 hidden lg:flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#7311d4] flex items-center justify-center text-white">
            <span className="text-2xl">🎪</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#7311d4]">EventPro</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === item.key
                  ? 'bg-[#7311d4] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-[#7311d4]/10 hover:text-[#7311d4]'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-[#7311d4]/10 border border-[#7311d4]/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-[#7311d4] uppercase tracking-wider mb-1">Current Status</p>
            <p className="text-sm dark:text-slate-300">{isAvailableForShifts ? 'Available for shifts' : 'Not available for shifts'}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto bg-[#f7f6f8] dark:bg-[#191022]">
        <header className="sticky top-0 z-10 bg-[#f7f6f8]/80 dark:bg-[#191022]/80 backdrop-blur-md border-b border-slate-200 dark:border-[#7311d4]/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#7311d4] overflow-hidden shadow-lg shadow-[#7311d4]/20 bg-[#7311d4]/20 flex items-center justify-center">
              <span className="text-2xl">{worker?.name?.[0] || '👤'}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none mb-1 dark:text-white">{worker?.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#7311d4]/20 text-[#7311d4] uppercase">{worker?.role || 'worker'}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">${worker?.hourly_rate}/hr</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('events')} className="p-2 rounded-full bg-slate-200 dark:bg-[#7311d4]/10 text-slate-600 dark:text-[#7311d4] relative">
              <span className="text-xl">🔔</span>
              {availableEvents.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#f7f6f8] dark:border-[#191022]"></span>}
            </button>

            <button
              onClick={() => {
                setShowLogin(true);
                setWorkerId(null);
                setWorker(null);
                setActiveSection('dashboard');
              }}
              className="px-4 py-2 rounded-lg bg-[#7311d4] text-white font-medium hover:brightness-110 transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto w-full space-y-8">
          {assignmentError && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
              {assignmentError}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7311d4] to-purple-900 p-8 text-white">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-2">Worker Portal</h2>
                  <p className="text-purple-100 dark:text-slate-300 max-w-md">Welcome back, {worker?.name}. You have {upcomingConfirmedAssignments.length} upcoming shifts. Check out new available roles below.</p>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-20">
                  <span className="text-[12rem]">📅</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming Confirmed Shifts</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{upcomingConfirmedAssignments.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Open Event Roles</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{availableEvents.length}</p>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                    <span className="text-[#7311d4]">📅</span>
                    My Schedule
                  </h3>
                  <button onClick={() => setActiveSection('schedule')} className="text-sm font-medium text-[#7311d4] hover:underline">View All</button>
                </div>
                {renderScheduleCards(upcomingConfirmedAssignments.slice(0, 3))}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                    <span className="text-[#7311d4]">🎫</span>
                    Available Events
                  </h3>
                  <button onClick={() => setActiveSection('events')} className="text-sm font-medium text-[#7311d4] hover:underline">View All</button>
                </div>
                {renderAvailableEvents(availableEvents.slice(0, 3))}
              </section>
            </>
          )}

          {activeSection === 'events' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                  <span className="text-[#7311d4]">🎫</span>
                  Available Events
                </h3>
              </div>
              {renderAvailableEvents(availableEvents)}
            </section>
          )}

          {activeSection === 'schedule' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                  <span className="text-[#7311d4]">📅</span>
                  My Schedule
                </h3>
              </div>
              {renderScheduleCards(upcomingConfirmedAssignments)}
            </section>
          )}

          {activeSection === 'earnings' && (
            <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-6">
              <h3 className="text-xl font-bold dark:text-white mb-4">Earnings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-[#7311d4]/10 p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Hourly Rate</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${Number(worker?.hourly_rate || 0).toFixed(2)}/hr</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-[#7311d4]/10 p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Estimated Upcoming Earnings</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${estimatedUpcomingEarnings.toFixed(2)}</p>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'history' && (
            <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-6">
              <h3 className="text-xl font-bold dark:text-white mb-4">Work History</h3>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Completed events and earnings</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Earned</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${historyTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyAssignments.length > 0 ? historyAssignments.map(assign => (
                  <div key={assign.id} className="rounded-lg border border-slate-200 dark:border-[#7311d4]/10 p-4 bg-white dark:bg-slate-900/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-lg dark:text-white">{assign.event_name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(assign.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {assign.start_time} - {assign.end_time}</p>
                        <p className="text-xs text-slate-400 mt-2">Role: {assign.role_for_event}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Hours</p>
                        <p className="text-lg font-bold dark:text-white">{calculateAssignmentPayableHours(assign).toFixed(2)}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Earned</p>
                        <p className="text-lg font-black text-[#7311d4]">${(Number(assign.estimated_earnings) || calculateAssignmentEarnings(assign)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8 col-span-full">No completed events in your history yet.</p>
                )}
              </div>
            </section>
          )}

          {activeSection === 'settings' && (
            <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-6">
              <h3 className="text-xl font-bold dark:text-white mb-4">Settings</h3>
              <div className="rounded-lg border border-slate-200 dark:border-[#7311d4]/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Availability</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Toggle whether you are available for new shifts</p>
                  </div>
                  <button
                    onClick={handleAvailabilityToggle}
                    disabled={isSavingAvailability}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${isAvailableForShifts ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {isSavingAvailability ? 'Saving...' : (isAvailableForShifts ? 'Available' : 'Unavailable')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unavailable From</span>
                    <input
                      type="date"
                      value={unavailableFrom}
                      onChange={(event) => setUnavailableFrom(event.target.value)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unavailable To</span>
                    <input
                      type="date"
                      value={unavailableTo}
                      onChange={(event) => setUnavailableTo(event.target.value)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSaveAvailability}
                  disabled={isSavingAvailability}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[#7311d4] text-white disabled:opacity-60"
                >
                  {isSavingAvailability ? 'Saving...' : 'Save Availability'}
                </button>

                {availabilityMessage && (
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{availabilityMessage}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default WorkerPortal;