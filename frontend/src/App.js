import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ManagerDashboard from './pages/ManagerDashboard';
import WorkerPortal from './pages/WorkerPortal';
import LandingPage from './pages/LandingPage';
import EventsList from './pages/EventsList';
import EventDetails from './pages/EventDetails';
import EventForm from './pages/EventForm';
import StaffManagement from './pages/StaffManagement';
import InventoryManagement from './pages/InventoryManagement';
import PaymentsManagement from './pages/PaymentsManagement';

function App() {
  return (
    <Router>
      <div className="dark">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/manager/*" element={<ManagerDashboard />} />
          <Route path="/worker" element={<WorkerPortal />} />
          <Route path="/manager/events" element={<EventsList />} />
          <Route path="/manager/staff" element={<StaffManagement />} />
          <Route path="/manager/inventory" element={<InventoryManagement />} />
          <Route path="/manager/payments" element={<PaymentsManagement />} />
          <Route path="/manager/events/new" element={<EventForm />} />
          <Route path="/manager/events/:id" element={<EventDetails />} />
          <Route path="/manager/events/:id/edit" element={<EventForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;