import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Navbar title={title} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
