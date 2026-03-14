import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7311d4] to-purple-900 flex items-center justify-center p-8">
      <div className="text-center text-white max-w-4xl">
        <h1 className="text-5xl font-black mb-4 tracking-tight">Event Management System</h1>
        <p className="text-xl mb-12 text-purple-200">Select your role to continue</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div 
            onClick={() => navigate('/manager')}
            className="bg-white rounded-2xl p-12 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-6xl mb-4">👔</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Manager</h2>
            <p className="text-gray-600">Manage events, staff, and inventory</p>
          </div>
          
          <div 
            onClick={() => navigate('/worker')}
            className="bg-white rounded-2xl p-12 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-6xl mb-4">👨‍🍳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Worker</h2>
            <p className="text-gray-600">View and confirm event assignments</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;