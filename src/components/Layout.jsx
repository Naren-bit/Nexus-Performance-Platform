import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();
  
  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: 'var(--bg-primary)', overflowX: 'hidden' }}>
      {/* Animated Background Mesh Harmonized with Landing Page */}
      <div className="gradient-mesh" style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.6 }}>
        <div className="floating-orb" style={{ animationDuration: '15s' }}></div>
        <div className="floating-orb" style={{ animationDuration: '20s', animationDelay: '-5s', width: '50vw', height: '50vw', left: '10%', top: '20%' }}></div>
        <div className="floating-orb" style={{ animationDuration: '18s', animationDelay: '-10s', width: '40vw', height: '40vw', right: '10%', top: '60%' }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar />
        <Sidebar />
        <main key={location.pathname} className="main-content page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
