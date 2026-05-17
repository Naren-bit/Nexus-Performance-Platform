import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getGoalSheet } from '../lib/goals';
import { isWindowOpen } from '../lib/utils';
import { PlusCircle, Edit3, ArrowRight, Target, CheckCircle2 } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user, cycle } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (cycle && user) {
        const s = await getGoalSheet(user.uid, cycle.id);
        setSheet(s);
      }
      setLoading(false);
    }
    loadData();
  }, [user, cycle]);

  if (loading) return <div className="empty-state"><div className="spinner"></div></div>;

  const goals = sheet?.goals || [];
  const totalWeightage = goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0);
  const status = sheet?.status || 'not_started';

  const getStatusBadge = (s) => {
    switch(s) {
      case 'not_started': return <span className="badge badge-not-started">Not Started</span>;
      case 'draft': return <span className="badge badge-draft">Draft</span>;
      case 'submitted': return <span className="badge badge-submitted">Pending Review</span>;
      case 'approved': return <span className="badge badge-approved">Approved</span>;
      case 'returned': return <span className="badge badge-returned">Returned</span>;
      default: return <span className="badge">{s}</span>;
    }
  };

  const getPhase = () => {
    if (!cycle) return '—';
    const now = new Date();
    if (now >= new Date(cycle.goalSettingOpen) && now <= new Date(cycle.goalSettingClose)) {
      return <span style={{ color: 'var(--accent-primary)' }}>🎯 Goal Setting</span>;
    }
    for (const q of ['Q1','Q2','Q3','Q4']) {
      if (cycle.quarters?.[q] && isWindowOpen(cycle.quarters[q])) {
        return <span style={{ color: 'var(--accent-secondary)' }}>📝 {q} Check-in</span>;
      }
    }
    return '—';
  };

  const getHeroContent = () => {
    if (!cycle) return { sub: 'No active goal cycle. Contact HR.', act: null };
    switch(status) {
      case 'not_started': return { 
        sub: "You haven't started creating goals yet. Get started!", 
        act: <Link to="/goals-create" className="btn btn-primary"><PlusCircle size={16}/> Create Goals</Link> 
      };
      case 'draft': return { 
        sub: 'Your goals are in draft. Complete and submit them for approval.', 
        act: <Link to="/goals-create" className="btn btn-primary"><Edit3 size={16}/> Continue Editing</Link> 
      };
      case 'submitted': return { 
        sub: 'Goals submitted! Waiting for manager approval.', 
        act: <span style={{ color: 'var(--text-muted)' }}>⏳ Pending manager review</span> 
      };
      case 'approved': return { 
        sub: 'Your goals are approved and locked. Track progress via check-ins.', 
        act: <Link to="/checkin" className="btn btn-success">Go to Check-ins <ArrowRight size={16}/></Link> 
      };
      case 'returned': return { 
        sub: 'Your manager returned your goals for rework. Review feedback below.', 
        act: <Link to="/goals-create" className="btn btn-primary"><Edit3 size={16}/> Continue Editing</Link> 
      };
      default: return {};
    }
  };

  const hero = getHeroContent();
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (totalWeightage / 100) * circumference;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p>Here's your goal tracking overview</p>
        </div>
      </div>

      <div className="card hero-card" style={{ display: 'flex', gap: '32px', marginBottom: '24px', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(91,95,255,0.05) 100%)' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: '8px' }}>Goal Sheet Status</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{hero.sub}</p>
          <div style={{ marginBottom: '16px' }}>{getStatusBadge(status)}</div>
          <div>{hero.act}</div>
          {status === 'returned' && sheet?.managerComment && (
            <div className="callout callout-warn" style={{ marginTop: '16px' }}>
              <strong>📝 Manager Feedback:</strong>
              <p style={{ marginTop: '4px' }}>{sheet.managerComment}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '150px' }}>
          <div className="circular-progress">
            <svg width="120" height="120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="60" cy="60" r={radius} fill="none" stroke="url(#gradient)" strokeWidth="8" 
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5B5FFF" />
                  <stop offset="100%" stopColor="#9B59FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="progress-text">{totalWeightage}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-3 gap-md" style={{ marginBottom: '24px' }}>
        <div className="card card-stat">
          <div className="stat-value">{goals.length}</div>
          <div className="stat-label">Goals Defined</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{totalWeightage}%</div>
          <div className="stat-label">Total Weightage</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {getPhase()}
          </div>
          <div className="stat-label">Current Phase</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h4>My Goals</h4>
          {status !== 'approved' && status !== 'submitted' && (
            <Link to="/goals-create" className="btn btn-primary btn-sm">
              <PlusCircle size={14}/> Add Goal
            </Link>
          )}
        </div>
        {goals.length === 0 ? (
          <div className="empty-state">
            <Target className="empty-icon" />
            <h3>No goals yet</h3>
            <p>Start by creating your first goal for this cycle.</p>
            {status !== 'submitted' && <Link to="/goals-create" className="btn btn-primary">Create Goals</Link>}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thrust Area</th>
                  <th>Goal Title</th>
                  <th>Target</th>
                  <th>Weightage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((g, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.85rem' }}>{g.thrustArea}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{g.title}</td>
                    <td className="text-mono">{g.target} {g.uom === 'percent' ? '%' : ''}</td>
                    <td className="text-mono text-primary">{g.weightage}%</td>
                    <td>{getStatusBadge(g.status || 'not_started')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h4>Quarterly Timeline</h4>
        </div>
        <div className="timeline">
          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
            const window = cycle?.quarters?.[q];
            const now = new Date();
            const isOpen = window && isWindowOpen(window);
            const isCompleted = window && now > new Date(window.close);
            let cls = 'timeline-item';
            if (isOpen) cls += ' active';
            if (isCompleted) cls += ' completed';
            
            return (
              <div key={q} className={cls}>
                <div className="timeline-dot">{isCompleted ? <CheckCircle2 size={16}/> : q}</div>
                <div className="timeline-label">Quarter {q.replace('Q','')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
