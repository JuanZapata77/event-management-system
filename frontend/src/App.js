import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ManagerDashboard from './pages/ManagerDashboard';
import WorkerPortal from './pages/WorkerPortal';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Router>
      <div className="dark">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/manager/*" element={<ManagerDashboard />} />
          <Route path="/worker" element={<WorkerPortal />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;