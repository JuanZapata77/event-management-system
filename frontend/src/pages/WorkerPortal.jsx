import React, { useState, useEffect } from 'react';

function WorkerPortal() {
  const [workerId, setWorkerId] = useState(null);
  const [worker, setWorker] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (workerId) {
      fetchWorkerData();
      fetchAvailableEvents();
      fetchMyAssignments();
    }
  }, [workerId]);

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
      const allAssignments = await assignmentsRes.json();

      setAllAssignments(allAssignments);

      const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        const today = new Date();
        return eventDate >= today && event.status !== 'completed' && event.status !== 'cancelled';
      });

      const available = upcomingEvents.filter(event => {
        const confirmedCaterers = allAssignments.filter(a => 
          a.event_id === event.id && 
          a.role_for_event === 'caterer' && 
          a.confirmation_status === 'confirmed'
        ).length;

        const confirmedBartenders = allAssignments.filter(a => 
          a.event_id === event.id && 
          a.role_for_event === 'bartender' && 
          a.confirmation_status === 'confirmed'
        ).length;

        const myAssignment = allAssignments.find(a => 
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
    setWorkerId(parseInt(selectedWorkerId));
    setShowLogin(false);
  };

  const handleConfirm = async (eventId, role) => {
    try {
      const existingAssignment = myAssignments.find(a => a.event_id === eventId);

      if (existingAssignment) {
        await fetch(`http://localhost:5000/api/staff-assignments/${existingAssignment.id}`, {
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
      } else {
        await fetch('http://localhost:5000/api/staff-assignments', {
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
      }

      fetchAvailableEvents();
      fetchMyAssignments();
    } catch (error) {
      console.error('Error confirming event:', error);
    }
  };

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
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-100 dark:bg-slate-900/50 border-r border-slate-200 dark:border-[#7311d4]/20 hidden lg:flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#7311d4] flex items-center justify-center text-white">
            <span className="text-2xl">🎪</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#7311d4]">EventPro</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#7311d4] text-white">
            <span className="text-xl">📊</span>
            <span className="font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-[#7311d4]/10 hover:text-[#7311d4] transition-colors cursor-pointer">
            <span className="text-xl">📅</span>
            <span className="font-medium">Events</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-[#7311d4]/10 hover:text-[#7311d4] transition-colors cursor-pointer">
            <span className="text-xl">📆</span>
            <span className="font-medium">My Schedule</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-[#7311d4]/10 hover:text-[#7311d4] transition-colors cursor-pointer">
            <span className="text-xl">💰</span>
            <span className="font-medium">Earnings</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-[#7311d4]/10 hover:text-[#7311d4] transition-colors cursor-pointer">
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Settings</span>
          </div>
        </nav>
        <div className="p-4 mt-auto">
          <div className="bg-[#7311d4]/10 border border-[#7311d4]/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-[#7311d4] uppercase tracking-wider mb-1">Current Status</p>
            <p className="text-sm dark:text-slate-300">Available for shifts</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#f7f6f8] dark:bg-[#191022]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#f7f6f8]/80 dark:bg-[#191022]/80 backdrop-blur-md border-b border-slate-200 dark:border-[#7311d4]/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#7311d4] overflow-hidden shadow-lg shadow-[#7311d4]/20 bg-[#7311d4]/20 flex items-center justify-center">
              <span className="text-2xl">{worker?.name?.[0] || '👤'}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none mb-1 dark:text-white">{worker?.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#7311d4]/20 text-[#7311d4] uppercase">Lead Server</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">${worker?.hourly_rate}/hr</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full bg-slate-200 dark:bg-[#7311d4]/10 text-slate-600 dark:text-[#7311d4] relative">
              <span className="text-xl">🔔</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#f7f6f8] dark:border-[#191022]"></span>
            </button>
            <button 
              onClick={() => {
                setShowLogin(true);
                setWorkerId(null);
                setWorker(null);
              }}
              className="px-4 py-2 rounded-lg bg-[#7311d4] text-white font-medium hover:brightness-110 transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto w-full space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7311d4] to-purple-900 p-8 text-white">
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-2">Worker Portal</h2>
              <p className="text-purple-100 dark:text-slate-300 max-w-md">Welcome back, {worker?.name}. You have {myAssignments.filter(a => a.confirmation_status === 'confirmed').length} upcoming shifts this week. Check out new available roles below.</p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-20">
              <span className="text-[12rem]">📅</span>
            </div>
          </div>

          {/* My Schedule Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <span className="text-[#7311d4]">📅</span>
                My Schedule
              </h3>
              <button className="text-sm font-medium text-[#7311d4] hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignments
                .filter(a => a.confirmation_status === 'confirmed')
                .map(assignment => (
                  <div key={assignment.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10 rounded-xl p-5 hover:border-[#7311d4]/40 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-green-500/10 text-green-500 rounded">Confirmed</span>
                      <span className="text-sm font-semibold dark:text-slate-300">{new Date(assignment.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h4 className="font-bold text-lg mb-1 dark:text-white">{assignment.event_name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{assignment.location} | {assignment.start_time} - {assignment.end_time}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#7311d4]/5">
                      <span className="text-xs font-medium text-slate-400">Position: {assignment.role_for_event}</span>
                      <span className="text-[#7311d4] font-bold">$125.00 Est.</span>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Available Events Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <span className="text-[#7311d4]">🎫</span>
                Available Events
              </h3>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-[#7311d4]/10">
                  <span className="text-sm">🔍</span>
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {availableEvents.length > 0 ? availableEvents.map(event => {
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
                                <div className="h-full bg-[#7311d4] rounded-full" style={{width: `${(caterersConfirmed / event.caterers_needed) * 100}%`}}></div>
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
                                <div className="h-full bg-[#7311d4] rounded-full" style={{width: `${(bartendersConfirmed / event.bartenders_needed) * 100}%`}}></div>
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
          </section>
        </div>
      </main>
    </div>
  );
}

export default WorkerPortal;