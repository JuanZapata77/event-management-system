import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagerSidebar from '../components/ManagerSidebar';

function EventsList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    date: 'all'
  });

  useEffect(() => {
    fetchEvents();
    fetchAssignments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, filters, searchTerm]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/staff-assignments');
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const applyFilters = () => {
    const now = new Date();
    let filtered = events.filter((event) => {
      const endDateTime = new Date(`${event.event_date}T${event.end_time}`);

      if (Number.isNaN(endDateTime.getTime())) {
        return true;
      }

      return endDateTime >= now;
    });

    if (filters.status !== 'all') {
      filtered = filtered.filter(e => e.status.toLowerCase() === filters.status.toLowerCase());
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(e => e.event_type.toLowerCase() === filters.type.toLowerCase());
    }

    if (filters.date !== 'all') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);

        if (filters.date === 'today') {
          return eventDate.getTime() === startOfToday.getTime();
        }

        if (filters.date === 'upcoming') {
          return eventDate.getTime() >= startOfToday.getTime();
        }

        if (filters.date === 'past') {
          return eventDate.getTime() < startOfToday.getTime();
        }

        if (filters.date === 'this_month') {
          return eventDate.getMonth() === startOfToday.getMonth() && eventDate.getFullYear() === startOfToday.getFullYear();
        }

        return true;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((event) => (
        event.event_name.toLowerCase().includes(term)
        || event.location.toLowerCase().includes(term)
        || event.event_type.toLowerCase().includes(term)
      ));
    }

    setFilteredEvents(filtered);
  };

  const getStaffingProgress = (eventId, caterersNeeded, bartendersNeeded) => {
    const totalNeeded = (caterersNeeded || 0) + (bartendersNeeded || 0);
    if (totalNeeded === 0) return { percent: 0, filled: 0, total: 0 };

    const confirmed = assignments.filter(a => 
      a.event_id === eventId && 
      a.confirmation_status === 'confirmed'
    ).length;

    return {
      percent: Math.round((confirmed / totalNeeded) * 100),
      filled: confirmed,
      total: totalNeeded
    };
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-green-600/20',
      pending: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-orange-600/20',
      draft: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 ring-slate-600/20',
      cancelled: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-red-600/20',
    };

    return styles[status.toLowerCase()] || styles.draft;
  };

  const getEventIcon = (type) => {
    const icons = {
      wedding: '💒',
      corporate: '🚀',
      birthday: '🎂',
      conference: '🎤',
      'non-profit': '❤️',
      gala: '✨',
    };
    return icons[type.toLowerCase()] || '🎉';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <ManagerSidebar active="events" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#f7f6f8]/50 dark:bg-[#191022]/50 backdrop-blur-md border-b border-[#7311d4]/10 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
              <input 
                className="w-full bg-slate-200/50 dark:bg-[#2a1b3d] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#7311d4] text-slate-900 dark:text-slate-100 placeholder:text-slate-500" 
                placeholder="Search events, locations, or clients..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-600 dark:text-slate-400 hover:text-[#7311d4] transition-colors">
              <span className="text-2xl">🔔</span>
              <span className="absolute top-0 right-0 size-2 bg-[#7311d4] rounded-full ring-2 ring-[#f7f6f8] dark:ring-[#191022]"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-[#7311d4]/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">Manager</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Event Manager</p>
              </div>
              <div className="size-10 rounded-full bg-[#7311d4]/20 border border-[#7311d4]/30"></div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="p-8 overflow-y-auto">
          {/* Page Title & Primary Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Events Management</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Efficiently plan, staff, and track all your event logistics.</p>
            </div>
            <button
              onClick={() => navigate('/manager/events/new')}
              className="flex items-center justify-center gap-2 bg-[#7311d4] hover:bg-[#7311d4]/90 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-[#7311d4]/25"
            >
              <span className="text-xl">➕</span>
              Add Event
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-200/50 dark:bg-[#2a1b3d] rounded-lg border border-[#7311d4]/10">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status:</span>
              <select 
                className="bg-white dark:bg-[#231534] border border-slate-300 dark:border-[#7311d4]/20 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-[#7311d4] font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-200/50 dark:bg-[#2a1b3d] rounded-lg border border-[#7311d4]/10">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Type:</span>
              <select 
                className="bg-white dark:bg-[#231534] border border-slate-300 dark:border-[#7311d4]/20 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-[#7311d4] font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="all">All Types</option>
                <option value="wedding">Wedding</option>
                <option value="corporate">Corporate</option>
                <option value="birthday">Birthday</option>
                <option value="conference">Conference</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-200/50 dark:bg-[#2a1b3d] rounded-lg border border-[#7311d4]/10">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date:</span>
              <select
                className="bg-white dark:bg-[#231534] border border-slate-300 dark:border-[#7311d4]/20 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-[#7311d4] font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
            <button 
              onClick={() => setFilters({ status: 'all', type: 'all', date: 'all' })}
              className="ml-auto text-sm font-medium text-[#7311d4] hover:underline"
            >
              Clear Filters
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#2a1b3d]/30 rounded-xl border border-[#7311d4]/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#2a1b3d]/50 border-b border-[#7311d4]/10">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Event Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date & Time</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Location</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Staffing Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7311d4]/5">
                  {filteredEvents.map(event => {
                    const staffing = getStaffingProgress(event.id, event.caterers_needed, event.bartenders_needed);
                    
                    return (
                      <tr key={event.id} className="hover:bg-[#7311d4]/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-[#7311d4]/10 flex items-center justify-center text-2xl">
                              {getEventIcon(event.event_type)}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{event.event_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{event.event_type}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{event.start_time} - {event.end_time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <span className="text-lg">📍</span>
                            {event.location}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[120px]">
                            <div className="flex justify-between text-[10px] mb-1 font-bold">
                              <span className={staffing.percent >= 75 ? 'text-[#7311d4]' : staffing.percent >= 40 ? 'text-orange-500' : 'text-slate-500'}>
                                {staffing.percent}%
                              </span>
                              <span className="text-slate-500">{staffing.filled}/{staffing.total}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${staffing.percent >= 75 ? 'bg-[#7311d4]' : staffing.percent >= 40 ? 'bg-orange-500' : 'bg-slate-400'}`}
                                style={{width: `${staffing.percent}%`}}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ring-inset ${getStatusBadge(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => navigate(`/manager/events/${event.id}`)}
                              className="p-1.5 rounded-lg hover:bg-[#7311d4]/10 text-slate-400 hover:text-[#7311d4] transition-colors"
                            >
                              <span className="text-lg">👁️</span>
                            </button>
                            <button
                              onClick={() => navigate(`/manager/events/${event.id}/edit`)}
                              className="p-1.5 rounded-lg hover:bg-[#7311d4]/10 text-slate-400 hover:text-[#7311d4] transition-colors"
                            >
                              <span className="text-lg">✏️</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        No events match your filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#2a1b3d]/50 border-t border-[#7311d4]/10 flex items-center justify-between">
              <span className="text-sm text-slate-500">Showing 1-{filteredEvents.length} of {events.length} events</span>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg border border-[#7311d4]/10 text-slate-500 hover:bg-[#7311d4] hover:text-white transition-all disabled:opacity-50" disabled>
                  <span className="text-lg">◀️</span>
                </button>
                <button className="size-8 rounded-lg bg-[#7311d4] text-white font-bold text-xs">1</button>
                <button className="p-2 rounded-lg border border-[#7311d4]/10 text-slate-500 hover:bg-[#7311d4] hover:text-white transition-all">
                  <span className="text-lg">▶️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EventsList;