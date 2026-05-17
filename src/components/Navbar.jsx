import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { logout } from '../lib/auth';
import { LayoutDashboard, Target, CheckSquare, TrendingUp, LogOut, Activity } from 'lucide-react';

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
        <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} />
        </div>
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
                <Link to={`/dashboard-${user.role}`}>
                  <LayoutDashboard size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px' }} /> Dashboard
                </Link>
                {user.role === 'employee' && (
                  <>
                    <Link to="/goals-create">
                      <Target size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px' }} /> My Goals
                    </Link>
                    <Link to="/checkin">
                      <CheckSquare size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px' }} /> Check-ins
                    </Link>
                  </>
                )}
                <Link to="/analytics">
                  <TrendingUp size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px' }} /> Analytics
                </Link>
                <div className="divider"></div>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                  <LogOut size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px' }} /> Sign Out
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
