import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { logout } from '../lib/auth';

export default function Navbar() {
  const { user, cycle } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="logo-icon">⚛</div>
        <span className="hide-mobile">Nexus</span>
      </div>
      <div className="navbar-center">
        <span className="cycle-badge">
          {cycle ? (cycle.name || cycle.id) : 'No Active Cycle'}
        </span>
      </div>
      <div className="navbar-right">
        {user && (
          <div className="user-dropdown">
            <div 
              className="user-avatar" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user.name ? user.name[0] : '?'}
            </div>
            {dropdownOpen && (
              <div className="user-dropdown-menu active">
                <div style={{ padding: '12px 16px' }}>
                  <div className="user-name" style={{ fontWeight: 600 }}>{user.name}</div>
                  <div className="user-email" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
                <div className="divider"></div>
                <Link to={`/dashboard-${user.role}`}>📊 Dashboard</Link>
                {user.role === 'employee' && (
                  <>
                    <Link to="/goals-create">🎯 My Goals</Link>
                    <Link to="/checkin">📝 Check-ins</Link>
                  </>
                )}
                <Link to="/analytics">📈 Analytics</Link>
                <div className="divider"></div>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>🚪 Sign Out</a>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
