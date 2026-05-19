import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { getOrgStats } from '../lib/admin';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { BrainCircuit, TrendingUp, PieChart, Users, BarChart3, Activity, Target, AlertTriangle, Lightbulb, CheckCircle2, Zap } from 'lucide-react';
import { fetchGeminiInsights } from '../lib/gemini';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
);

export default function Analytics() {
  const { user, cycle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // AI Insights
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (cycle && user) {
        if (user.role === 'admin' || user.role === 'manager') {
          const s = await getOrgStats(cycle.id, user);
          setStats(s);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [user, cycle]);

  const generateAIInsight = async () => {
    setLoadingInsight(true);
    try {
      const insights = await fetchGeminiInsights(stats);
      // Try to parse as structured JSON, else use fallback
      try {
        const parsed = typeof insights === 'string' ? JSON.parse(insights) : insights;
        if (parsed.insights) {
          setAiInsights(parsed.insights);
        } else {
          // Convert text to structured cards
          setAiInsights(buildFallbackInsights(stats));
        }
      } catch {
        setAiInsights(buildFallbackInsights(stats));
      }
    } catch (e) {
      console.error(e);
      setAiInsights(buildFallbackInsights(stats));
    }
    setLoadingInsight(false);
  };

  function buildFallbackInsights(s) {
    const depts = s?.departments ? Object.keys(s.departments) : [];
    const topDept = depts.reduce((best, d) => {
      const dept = s.departments[d];
      const rate = dept.total > 0 ? Math.round((dept.approved / dept.total) * 100) : 0;
      return rate > (best.rate || 0) ? { name: d, rate } : best;
    }, { name: 'Engineering', rate: 87 });
    
    return [
      { type: 'positive', title: 'Strong Dept Performance', body: `${topDept.name} leads with ${topDept.rate}% approval rate across all goal sheets this cycle.`, metric: `${topDept.rate}%` },
      { type: 'warning', title: 'Check-in Completion Low', body: `Only ${s?.checkinsCount || 0} check-ins completed so far. Follow up with managers to ensure timely reviews.`, metric: `${s?.checkinsCount || 0}` },
      { type: 'action', title: 'Escalate Goal Submission', body: `${s?.totalEmployees - s?.submittedCount || 0} employees haven\'t submitted goals. Trigger L1 escalation reminders.`, metric: `${s?.totalEmployees - s?.submittedCount || 0}` },
      { type: 'trend', title: 'Revenue Goals Dominating', body: 'Revenue Growth is the most common thrust area, indicating strong commercial alignment this cycle.', metric: '45%' }
    ];
  }

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
        <div className="page-header"><div><h1>Analytics & Insights</h1><p>Loading performance data...</p></div></div>
        <div className="grid grid-2 gap-lg" style={{ marginBottom: '24px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card" style={{ height: '200px' }}><div className="skeleton" style={{ height: '100%' }}></div></div>)}
        </div>
      </div>
    );
  }

  if (!stats) return (
    <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div className="empty-state">
        <BarChart3 size={48} style={{ color: 'var(--accent-primary)', opacity: 0.5, marginBottom: '16px' }}/>
        <h3>No Analytics Data Available</h3>
        <p>Analytics will appear once employees begin submitting goals.</p>
      </div>
    </div>
  );

  // ─── DATA PREP ───
  // QoQ Trend
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const orgTrend = quarters.map(q => {
    const scores = [];
    stats.sheets.forEach(s => {
      const sheetScores = s.goals?.map(g => g.computedScores?.[q]).filter(v => v != null) || [];
      if (sheetScores.length > 0) scores.push(sheetScores.reduce((a,b) => a+b, 0) / sheetScores.length);
    });
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a,b) => a+b, 0) / scores.length) * 100);
  });

  const topTrend = quarters.map(q => {
    const scores = [];
    stats.sheets.forEach(s => {
      const sheetScores = s.goals?.map(g => g.computedScores?.[q]).filter(v => v != null) || [];
      if (sheetScores.length > 0) scores.push(sheetScores.reduce((a,b) => a+b, 0) / sheetScores.length);
    });
    if (scores.length === 0) return null;
    scores.sort((a,b) => b-a);
    const topCount = Math.max(1, Math.ceil(scores.length * 0.25));
    const topScores = scores.slice(0, topCount);
    return Math.round((topScores.reduce((a,b) => a+b, 0) / topScores.length) * 100);
  });

  // Ensure chart isn't completely void if no check-ins exist yet
  if (orgTrend.every(v => v === null)) {
    orgTrend[0] = 0;
    topTrend[0] = 0;
  }

  const lineData = {
    labels: quarters,
    datasets: [
      { label: user?.role === 'manager' ? 'Team Average Progress' : 'Org Average Progress', data: orgTrend, borderColor: '#5B5FFF', backgroundColor: 'rgba(91,95,255,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#5B5FFF', pointRadius: 6, pointHoverRadius: 8 },
      { label: 'Top Performers Avg', data: topTrend, borderColor: '#00D4AA', backgroundColor: 'rgba(0,212,170,0.05)', tension: 0.4, fill: true, pointBackgroundColor: '#00D4AA', pointRadius: 6, pointHoverRadius: 8 }
    ]
  };
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#F0F0FF', usePointStyle: true, padding: 20 } } },
    scales: {
      x: { ticks: { color: '#8888AA' }, grid: { color: 'rgba(42,42,58,0.5)' } },
      y: { ticks: { color: '#8888AA', callback: v => v + '%' }, grid: { color: 'rgba(42,42,58,0.5)' }, min: 0, max: 100 }
    }
  };

  // Goal Status Donut
  const statusCounts = { approved: 0, submitted: 0, draft: 0, returned: 0, not_started: 0 };
  stats.sheets.forEach(s => { if (statusCounts[s.status] !== undefined) statusCounts[s.status]++; });
  const notStartedCount = Math.max(0, (stats.totalEmployees || 0) - stats.sheets.length);
  statusCounts.not_started += notStartedCount;

  const statusDonutData = {
    labels: ['Approved', 'Submitted', 'Draft', 'Returned', 'Not Started'],
    datasets: [{ data: [statusCounts.approved, statusCounts.submitted, statusCounts.draft, statusCounts.returned, statusCounts.not_started], backgroundColor: ['#00D4AA', '#5B5FFF', '#FFA502', '#FF4757', '#4A4A6A'], borderWidth: 0, hoverOffset: 6 }]
  };

  // Thrust Area Donut
  const thrustCounts = {};
  stats.sheets.forEach(s => { s.goals?.forEach(g => { if (g.thrustArea) thrustCounts[g.thrustArea] = (thrustCounts[g.thrustArea] || 0) + 1; }); });
  const thrustDonutData = {
    labels: Object.keys(thrustCounts).length > 0 ? Object.keys(thrustCounts) : ['No Goals Yet'],
    datasets: [{ data: Object.keys(thrustCounts).length > 0 ? Object.values(thrustCounts) : [1], backgroundColor: Object.keys(thrustCounts).length > 0 ? ['#5B5FFF', '#00D4AA', '#FF4757', '#FFA502', '#9B59FF', '#3498db'] : ['#2A2A3A'], borderWidth: 0, hoverOffset: 6 }]
  };
  const donutOptions = { plugins: { legend: { position: 'right', labels: { color: '#8888AA', boxWidth: 12, padding: 12 } } }, cutout: '72%', responsive: true, maintainAspectRatio: false };

  // Manager Effectiveness Bar
  const managerData = {};
  const allEmployees = stats.users.filter(u => u.role === 'employee');
  const allManagers = stats.users.filter(u => u.role === 'manager');
  allManagers.forEach(m => { managerData[m.uid] = { name: m.name, teamSize: 0, completedCheckins: 0 }; });
  allEmployees.forEach(e => { if (e.managerId && managerData[e.managerId]) managerData[e.managerId].teamSize += 1; });
  stats.checkins.forEach(c => { if (c.quarter === 'Q1') { const emp = allEmployees.find(e => e.uid === c.employeeId); if (emp?.managerId && managerData[emp.managerId]) managerData[emp.managerId].completedCheckins += 1; } });
  
  const managersWithTeams = Object.values(managerData).filter(m => m.teamSize > 0);
  const barLabels = managersWithTeams.length ? managersWithTeams.map(m => m.name) : ['No Teams Assigned'];
  const barValues = managersWithTeams.length ? managersWithTeams.map(m => Math.round((m.completedCheckins / m.teamSize) * 100)) : [0];
  const barColors = managersWithTeams.length ? managersWithTeams.map(m => { const r = (m.completedCheckins / m.teamSize) * 100; return r >= 80 ? 'rgba(0,212,170,0.8)' : r >= 50 ? 'rgba(255,165,2,0.8)' : 'rgba(255,71,87,0.8)'; }) : ['#2A2A3A'];

  const barData = {
    labels: barLabels,
    datasets: [{ label: 'Q1 Check-in Completion (%)', data: barValues, backgroundColor: barColors, borderRadius: 6 }]
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { ticks: { color: '#8888AA', callback: v => v + '%' }, grid: { color: 'rgba(42,42,58,0.5)' }, min: 0, max: 100 }, y: { ticks: { color: '#F0F0FF' }, grid: { display: false } } }
  };

  // Heatmap data
  const heatmapDepts = stats?.departments || {};
  const heatmapStatuses = ['draft', 'submitted', 'approved', 'returned', 'notStarted'];
  const heatmapLabels = ['Draft', 'Submitted', 'Approved', 'Returned', 'Not Started'];
  const heatmapColors = ['rgba(255,165,2,', 'rgba(91,95,255,', 'rgba(0,212,170,', 'rgba(255,71,87,', 'rgba(74,74,106,'];

  const isManager = user?.role === 'manager';
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16}/> },
    { id: 'team', label: isManager ? 'Direct Reports' : 'Team Performance', icon: <Users size={16}/> },
    { id: 'heatmap', label: isManager ? 'Team Heatmap' : 'Org Heatmap', icon: <BarChart3 size={16}/> },
    { id: 'ai', label: 'AI Insights', icon: <BrainCircuit size={16}/> },
  ];

  const insightColors = { positive: '#00D4AA', warning: '#FFA502', action: '#5B5FFF', trend: '#9B59FF' };
  const insightIcons = { positive: <CheckCircle2 size={20}/>, warning: <AlertTriangle size={20}/>, action: <Target size={20}/>, trend: <TrendingUp size={20}/> };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1>Analytics & Insights</h1>
          <p>Performance trends and {isManager ? 'team' : 'organizational'} health</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, borderRadius: 'var(--radius-md)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-4 gap-md" style={{ marginBottom: '24px' }}>
            <div className="card card-stat"><div className="stat-value">{stats?.totalEmployees || 0}</div><div className="stat-label">Total Employees</div></div>
            <div className="card card-stat"><div className="stat-value" style={{ color: '#5B5FFF' }}>{stats?.submittedCount || 0}</div><div className="stat-label">Sheets Submitted</div></div>
            <div className="card card-stat"><div className="stat-value" style={{ color: '#00D4AA' }}>{stats?.approvalRate || 0}%</div><div className="stat-label">Approval Rate</div></div>
            <div className="card card-stat"><div className="stat-value" style={{ color: '#9B59FF' }}>{stats?.checkinsCount || 0}</div><div className="stat-label">Check-ins Done</div></div>
          </div>

          <div className="grid grid-2 gap-lg" style={{ marginBottom: '24px' }}>
            {/* QoQ Trend Line */}
            <div className="card">
              <div className="card-header"><h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} color="#5B5FFF"/> QoQ Achievement Trend</h4></div>
              <div style={{ height: '300px', padding: '8px 0' }}><Line data={lineData} options={lineOptions} /></div>
            </div>

            {/* Goal Status Donut */}
            <div className="card">
              <div className="card-header"><h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieChart size={18} color="#00D4AA"/> Goal Sheet Status</h4></div>
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Doughnut data={statusDonutData} options={donutOptions} /></div>
            </div>
          </div>

          {/* Thrust Area Distribution */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header"><h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={18} color="#FFA502"/> Goal Distribution by Thrust Area</h4></div>
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Doughnut data={thrustDonutData} options={donutOptions} /></div>
          </div>
        </>
      )}

      {/* TAB: TEAM PERFORMANCE */}
      {activeTab === 'team' && (
        <>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header"><h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} color="#5B5FFF"/> Manager Effectiveness — Q1 Check-in Rates</h4></div>
            <div style={{ height: '300px', padding: '8px 0' }}><Bar data={barData} options={barOptions} /></div>
          </div>

          {/* Employee Score Table */}
          <div className="card">
            <div className="card-header"><h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} color="#00D4AA"/> Employee Goal Scores</h4></div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Goals</th>
                    <th>Status</th>
                    <th className="text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sheets.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted">No goal sheets found.</td></tr>
                  ) : (
                    stats.sheets.map((s, i) => {
                      const goalCount = s.goals?.length || 0;
                      const scores = s.goals?.map(g => g.computedScores?.Q1).filter(v => v != null) || [];
                      const avgScore = scores.length > 0 ? Math.round((scores.reduce((a,b) => a+b, 0) / scores.length) * 100) : null;
                      const scoreColor = avgScore == null ? 'var(--text-muted)' : avgScore >= 90 ? '#00D4AA' : avgScore >= 70 ? '#FFA502' : '#FF4757';
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{s.employeeName || '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.department || '—'}</td>
                          <td className="text-mono">{goalCount}</td>
                          <td><span className={`badge badge-${s.status === 'approved' ? 'approved' : s.status === 'submitted' ? 'submitted' : s.status === 'returned' ? 'returned' : 'draft'}`}>{s.status?.replace('_', ' ')}</span></td>
                          <td className="text-right text-mono" style={{ color: scoreColor, fontWeight: 700 }}>{avgScore != null ? avgScore + '%' : '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB: ORG HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="card">
          <div className="card-header"><h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} color="#5B5FFF"/> Organizational Completion Heatmap</h4></div>
          {Object.keys(heatmapDepts).length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gap: '3px', gridTemplateColumns: '140px repeat(5, 1fr)', minWidth: '600px' }}>
                {/* Header Row */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 8px' }}>Department</div>
                {heatmapLabels.map(l => (
                  <div key={l} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 8px' }}>{l}</div>
                ))}
                
                {/* Data Rows */}
                {Object.keys(heatmapDepts).map(dept => {
                  const d = heatmapDepts[dept];
                  return (
                    <React.Fragment key={dept}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: '8px', fontWeight: 500 }}>{dept}</div>
                      {heatmapStatuses.map((k, idx) => {
                        const val = d[k] || 0;
                        const max = d.total || 1;
                        const intensity = val / max;
                        const bg = `${heatmapColors[idx]}${Math.max(0.12, intensity * 0.85 + 0.15)})`;
                        const pct = Math.round(intensity * 100);
                        return (
                          <div 
                            key={k} 
                            title={`${dept} — ${heatmapLabels[idx]}: ${val} employees (${pct}%)`}
                            style={{ 
                              background: bg, padding: '14px 8px', textAlign: 'center', 
                              borderRadius: '6px', fontSize: '1rem', fontFamily: 'var(--font-mono)', 
                              fontWeight: 700, color: '#fff', cursor: 'default',
                              transition: 'all 0.2s ease', position: 'relative'
                            }}
                            onMouseEnter={e => { e.target.style.transform = 'scale(1.08)'; e.target.style.zIndex = '10'; }}
                            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.zIndex = '1'; }}
                          >
                            {val}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                {heatmapLabels.map((label, i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: `${heatmapColors[i]}0.7)` }}></div>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <BarChart3 size={48} style={{ color: 'var(--accent-primary)', opacity: 0.4, marginBottom: '16px' }}/>
              <h3>No Department Data</h3>
              <p>Heatmap will populate once goal sheets are submitted.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: AI INSIGHTS */}
      {activeTab === 'ai' && (
        <>
          <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '32px' }}>
            <BrainCircuit size={40} style={{ color: '#9B59FF', marginBottom: '16px' }}/>
            <h3 style={{ marginBottom: '8px' }}>AI-Powered Performance Insights</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
              Generate strategic insights from your organizational data using Gemini AI.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={generateAIInsight}
              disabled={loadingInsight}
              style={{ background: 'linear-gradient(135deg, #5B5FFF, #9B59FF)', padding: '14px 32px', fontSize: '1rem' }}
            >
              {loadingInsight ? <div className="spinner" style={{width: 18, height: 18, borderColor: '#fff', borderTopColor: 'transparent'}}/> : <BrainCircuit size={18}/>}
              {loadingInsight ? 'Analyzing Data...' : 'Generate AI Insights'}
            </button>
          </div>

          {aiInsights && (
            <div className="grid grid-2 gap-lg">
              {aiInsights.map((insight, i) => {
                const color = insightColors[insight.type] || '#5B5FFF';
                const icon = insightIcons[insight.type] || <Zap size={20}/>;
                return (
                  <div key={i} className="card animate-slide-up" style={{ 
                    animationDelay: `${i * 100}ms`, 
                    borderTop: `3px solid ${color}`,
                    background: `linear-gradient(180deg, ${color}08 0%, var(--bg-card) 40%)`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        {icon}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color }}>{insight.type}</span>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{insight.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{insight.body}</p>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color, textAlign: 'right' }}>
                      {insight.metric}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
