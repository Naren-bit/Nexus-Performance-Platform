import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { logout } from '../lib/auth';

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Menu</div>
        <NavLink 
          to={`/dashboard-${user.role}`} 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="link-icon">📊</span> Dashboard
        </NavLink>
        
        {user.role === 'employee' && (
          <>
            <NavLink 
              to="/goals-create" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon">🎯</span> My Goals
            </NavLink>
            <NavLink 
              to="/checkin" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon">📝</span> Check-ins
            </NavLink>
          </>
        )}
        
        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="link-icon">📈</span> Analytics
        </NavLink>
        
        <div className="sidebar-section-title">Account</div>
        <a href="#" className="sidebar-link btn-logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
          <span className="link-icon">🚪</span> Sign Out
        </a>
      </nav>
    </aside>
  );
}
