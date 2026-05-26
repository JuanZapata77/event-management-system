import React, { useMemo, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

function WorkerPortal() {
  const [workerId, setWorkerId] = useState(null);
  const [worker, setWorker] = useState(null);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [showLogin, setShowLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isAvailableForShifts, setIsAvailableForShifts] = useState(true);
  const [unavailableFrom, setUnavailableFrom] = useState('');
  const [unavailableTo, setUnavailableTo] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [historyAssignments, setHistoryAssignments] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('eventAuthUser');
      const savedUser = rawUser ? JSON.parse(rawUser) : null;

      if (savedUser?.role === 'worker' && savedUser?.id) {
        setWorkerId(savedUser.id);
        setShowLogin(false);
      }
    } catch (error) {
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (workerId) {
      fetchWorkerData();
      fetchAvailableEvents();
      fetchMyAssignments();
      fetchHistory();
      fetchNotifications();
    }
  }, [workerId]);

  useEffect(() => {
    let interval;
    if (workerId) {
      // keep available events fresh so the bell can react to newly created events
      interval = setInterval(() => {
        fetchAvailableEvents();
        fetchMyAssignments();
        fetchNotifications();
      }, 30000);
    }

    return () => clearInterval(interval);
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

  const fetchWorkerData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${workerId}`);
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
        fetch(`${API_BASE_URL}/api/events`),
        fetch(`${API_BASE_URL}/api/staff-assignments`)
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
      const response = await fetch(`${API_BASE_URL}/api/staff-assignments/user/${workerId}`);
      const data = await response.json();
      setMyAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleLoginInputChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setIsLoggingIn(true);
      setLoginError('');

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginForm.username.trim().toLowerCase(),
          password: loginForm.password,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to sign in');
      }

      if (!payload?.user || payload.user.role !== 'worker') {
        throw new Error('Only worker accounts can access this portal');
      }

      localStorage.setItem('eventAuthUser', JSON.stringify(payload.user));
      localStorage.setItem('eventAuthToken', payload.token);
      setWorkerId(payload.user.id);
      setShowLogin(false);
      setActiveSection('dashboard');
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError(error.message || 'Unexpected error while signing in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConfirm = async (eventId, role) => {
    try {
      setAssignmentError('');
      const existingAssignment = myAssignments.find(a => a.event_id === eventId);

      if (existingAssignment) {
        const response = await fetch(`${API_BASE_URL}/api/staff-assignments/${existingAssignment.id}`, {
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
        const response = await fetch(`${API_BASE_URL}/api/staff-assignments`, {
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

      const response = await fetch(`${API_BASE_URL}/api/users/${workerId}/availability`, {
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
      const response = await fetch(`${API_BASE_URL}/api/staff-assignments/user/${workerId}/history`);
      const data = await response.json();
      setHistoryAssignments(data.assignments || []);
      setHistoryTotal(Number(data.total_earnings || 0));
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('eventAuthToken');
      const res = await fetch(`${API_BASE_URL}/api/notifications?userId=${workerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const notificationBadgeCount = unreadCount > 0 ? unreadCount : availableEvents.length;

  const mobileNavItems = navItems;

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
      <div className="relative min-h-screen overflow-hidden bg-[#0f081d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(115,17,212,0.4),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.15),_transparent_30%),linear-gradient(135deg,_#0f081d_0%,_#1b102c_45%,_#12091f_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:52px_52px]" />

        <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-[1.05fr,0.95fr] lg:px-10">
          <section className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur">
              <span className="text-lg">🧰</span>
              Worker portal
            </div>

            <h2 className="mt-6 text-5xl font-black tracking-tight text-white sm:text-6xl">
              Sign in, check shifts, and get moving.
            </h2>

            <p className="mt-6 max-w-lg text-lg leading-8 text-white/72">
              Use your worker login to view assignments, confirm attendance, and update availability from one place.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Shift updates</p>
                <p className="mt-1 text-sm leading-6 text-white/62">See new assignments and changes faster.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Availability</p>
                <p className="mt-1 text-sm leading-6 text-white/62">Keep your schedule current for managers.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/95 p-6 text-slate-900 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7311d4]">Worker login</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h3>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl ring-1 ring-inset ring-cyan-400/15">
                👨‍🍳
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleLogin}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Username</span>
                <input
                  type="text"
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginInputChange}
                  required
                  autoComplete="username"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7311d4] focus:bg-white focus:ring-4 focus:ring-[#7311d4]/15"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginInputChange}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7311d4] focus:bg-white focus:ring-4 focus:ring-[#7311d4]/15"
                />
              </label>

              {loginError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loginError}</p>
              ) : null}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#7311d4] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7311d4]/25 transition hover:-translate-y-0.5 hover:bg-[#6310b4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign in to portal'}
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#f7f6f8] dark:bg-[#191022] lg:h-screen lg:flex-row lg:overflow-hidden">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-100 dark:border-[#7311d4]/20 dark:bg-slate-900/50 lg:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7311d4] text-white">
            <span className="text-2xl">🎪</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#7311d4]">EventPro</span>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                activeSection === item.key
                  ? 'bg-[#7311d4] text-white'
                  : 'text-slate-600 hover:bg-[#7311d4]/10 hover:text-[#7311d4] dark:text-slate-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#7311d4]/10 p-4">
          <div className="rounded-xl border border-[#7311d4]/20 bg-[#7311d4]/10 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#7311d4]">Current Status</p>
            <p className="text-sm dark:text-slate-300">{isAvailableForShifts ? 'Available for shifts' : 'Not available for shifts'}</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-visible bg-[#f7f6f8] dark:bg-[#191022] lg:overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#f7f6f8]/90 px-4 py-4 backdrop-blur-md dark:border-[#7311d4]/10 dark:bg-[#191022]/90 sm:px-6 lg:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#7311d4] bg-[#7311d4]/20 shadow-lg shadow-[#7311d4]/20">
                <span className="text-2xl">{worker?.name?.[0] || '👤'}</span>
              </div>
              <div>
                <h1 className="mb-1 text-lg font-bold leading-none dark:text-white">{worker?.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#7311d4]/20 px-2 py-0.5 text-xs font-medium uppercase text-[#7311d4]">{worker?.role || 'worker'}</span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">${worker?.hourly_rate}/hr</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button onClick={() => setActiveSection('events')} className="relative rounded-full bg-slate-200 p-2 text-slate-600 dark:bg-[#7311d4]/10 dark:text-[#7311d4]">
                <span className="text-xl">🔔</span>
                {notificationBadgeCount > 0 && (
                  <span className="absolute right-0 top-0 inline-flex translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold leading-none text-white">
                    {notificationBadgeCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('eventAuthUser');
                  localStorage.removeItem('eventAuthToken');
                  setShowLogin(true);
                  setWorkerId(null);
                  setWorker(null);
                  setActiveSection('dashboard');
                }}
                className="rounded-lg bg-[#7311d4] px-4 py-2 font-medium text-white transition-all hover:brightness-110"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200/80 bg-[#f7f6f8]/95 px-4 py-3 dark:border-[#7311d4]/10 dark:bg-[#191022]/95 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mobileNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeSection === item.key
                    ? 'bg-[#7311d4] text-white shadow-lg shadow-[#7311d4]/20'
                    : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-[#7311d4]/10 hover:text-[#7311d4] dark:bg-slate-900/40 dark:text-slate-300 dark:ring-[#7311d4]/10'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 pb-10 sm:px-6 sm:py-6 lg:px-6">
          {assignmentError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {assignmentError}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7311d4] to-purple-900 p-6 text-white sm:p-8">
                <div className="relative z-10 max-w-md">
                  <h2 className="mb-2 text-2xl font-black sm:text-3xl">Worker Portal</h2>
                  <p className="text-sm leading-6 text-purple-100 dark:text-slate-300 sm:text-base">
                    Welcome back, {worker?.name}. You have {upcomingConfirmedAssignments.length} upcoming shifts. Check out new available roles below.
                  </p>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-20">
                  <span className="text-[8rem] sm:text-[12rem]">📅</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#7311d4]/10 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming Confirmed Shifts</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{upcomingConfirmedAssignments.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#7311d4]/10 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Open Event Roles</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{availableEvents.length}</p>
                </div>
              </div>

              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-xl font-bold dark:text-white">
                    <span className="text-[#7311d4]">📅</span>
                    My Schedule
                  </h3>
                  <button onClick={() => setActiveSection('schedule')} className="text-sm font-medium text-[#7311d4] hover:underline">View All</button>
                </div>
                {renderScheduleCards(upcomingConfirmedAssignments.slice(0, 3))}
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-xl font-bold dark:text-white">
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
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold dark:text-white">
                  <span className="text-[#7311d4]">🎫</span>
                  Available Events
                </h3>
              </div>
              {renderAvailableEvents(availableEvents)}
            </section>
          )}

          {activeSection === 'schedule' && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold dark:text-white">
                  <span className="text-[#7311d4]">📅</span>
                  My Schedule
                </h3>
              </div>
              {renderScheduleCards(upcomingConfirmedAssignments)}
            </section>
          )}

          {activeSection === 'earnings' && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#7311d4]/10 dark:bg-slate-900/40">
              <h3 className="mb-4 text-xl font-bold dark:text-white">Earnings</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4 dark:border-[#7311d4]/10">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Hourly Rate</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${Number(worker?.hourly_rate || 0).toFixed(2)}/hr</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 dark:border-[#7311d4]/10">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Estimated Upcoming Earnings</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${estimatedUpcomingEarnings.toFixed(2)}</p>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'history' && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#7311d4]/10 dark:bg-slate-900/40">
              <h3 className="mb-4 text-xl font-bold dark:text-white">Work History</h3>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Completed events and earnings</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Earned</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${historyTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {historyAssignments.length > 0 ? historyAssignments.map(assign => (
                  <div key={assign.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-[#7311d4]/10 dark:bg-slate-900/30">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-bold dark:text-white">{assign.event_name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(assign.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {assign.start_time} - {assign.end_time}</p>
                        <p className="mt-2 text-xs text-slate-400">Role: {assign.role_for_event}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Hours</p>
                        <p className="text-lg font-bold dark:text-white">{calculateAssignmentPayableHours(assign).toFixed(2)}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Earned</p>
                        <p className="text-lg font-black text-[#7311d4]">${(Number(assign.estimated_earnings) || calculateAssignmentEarnings(assign)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="col-span-full py-8 text-center text-slate-500 dark:text-slate-400">No completed events in your history yet.</p>
                )}
              </div>
            </section>
          )}

          {activeSection === 'settings' && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#7311d4]/10 dark:bg-slate-900/40">
              <h3 className="mb-4 text-xl font-bold dark:text-white">Settings</h3>
              <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-[#7311d4]/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Availability</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Toggle whether you are available for new shifts</p>
                  </div>
                  <button
                    onClick={handleAvailabilityToggle}
                    disabled={isSavingAvailability}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${isAvailableForShifts ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {isSavingAvailability ? 'Saving...' : (isAvailableForShifts ? 'Available' : 'Unavailable')}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unavailable From</span>
                    <input
                      type="date"
                      value={unavailableFrom}
                      onChange={(event) => setUnavailableFrom(event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unavailable To</span>
                    <input
                      type="date"
                      value={unavailableTo}
                      onChange={(event) => setUnavailableTo(event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSaveAvailability}
                  disabled={isSavingAvailability}
                  className="rounded-lg bg-[#7311d4] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
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