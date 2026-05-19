import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ManagerDashboard from './pages/ManagerDashboard';
import WorkerPortal from './pages/WorkerPortal';
import LandingPage from './pages/LandingPage';
import EventsList from './pages/EventsList';
import EventDetails from './pages/EventDetails';
import EventForm from './pages/EventForm';
import StaffManagement from './pages/StaffManagement';
import InventoryManagement from './pages/InventoryManagement';
import PaymentsManagement from './pages/PaymentsManagement';
import ManagerLogin from './pages/ManagerLogin';

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('eventAuthUser');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function ManagerRoute({ children }) {
  const user = getCurrentUser();

  if (!user || user.role !== 'manager') {
    return <Navigate to="/manager/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <div className="dark">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/manager/login" element={<ManagerLogin />} />
          <Route path="/manager/*" element={<ManagerRoute><ManagerDashboard /></ManagerRoute>} />
          <Route path="/worker" element={<WorkerPortal />} />
          <Route path="/manager/events" element={<ManagerRoute><EventsList /></ManagerRoute>} />
          <Route path="/manager/staff" element={<ManagerRoute><StaffManagement /></ManagerRoute>} />
          <Route path="/manager/inventory" element={<ManagerRoute><InventoryManagement /></ManagerRoute>} />
          <Route path="/manager/payments" element={<ManagerRoute><PaymentsManagement /></ManagerRoute>} />
          <Route path="/manager/events/new" element={<ManagerRoute><EventForm /></ManagerRoute>} />
          <Route path="/manager/events/:id" element={<ManagerRoute><EventDetails /></ManagerRoute>} />
          <Route path="/manager/events/:id/edit" element={<ManagerRoute><EventForm /></ManagerRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;