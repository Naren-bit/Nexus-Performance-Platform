import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { getOrgStats } from '../lib/admin';
import { getTeamMembers, getTeamGoalSheets } from '../lib/goals';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { BrainCircuit, TrendingUp, BarChart3, PieChart, Users } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
);

export default function Analytics() {
  const { user, cycle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // States for Claude
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (cycle && user) {
        if (user.role === 'admin' || user.role === 'manager') {
          // Both managers and admins can see org stats for the hackathon simplicity, 
          // but you could restrict it to team only for manager.
          const s = await getOrgStats(cycle.id);
          setStats(s);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [user, cycle]);

  const generateAIInsight = () => {
    setLoadingInsight(true);
    // Simulating API call to Claude
    setTimeout(() => {
      setAiInsight(
        "Based on the current cycle data:\n" +
        "• **Engineering** is lagging in goal submissions (40% draft state). Recommend follow-ups.\n" +
        "• **Sales** has the highest Q1 check-in completion rate (92%).\n" +
        "• Most goals are concentrated in 'Revenue Growth' indicating strong alignment with Q1 OKRs.\n" +
        "• **Action item:** Escalate Q1 non-checkins for 12 employees before the window closes."
      );
      setLoadingInsight(false);
    }, 1500);
  };

  if (loading) return <div className="empty-state"><div className="spinner"></div></div>;
  if (!stats) return <div className="empty-state"><p>No analytics data available yet.</p></div>;

  // 1. QoQ Trend Data
  const lineData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Org Average Progress',
        data: [72, 81, null, null],
        borderColor: '#5B5FFF',
        backgroundColor: 'rgba(91,95,255,0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Top Performers Avg',
        data: [85, 92, null, null],
        borderColor: '#00D4AA',
        tension: 0.4,
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#F0F0FF' } } },
    scales: {
      x: { ticks: { color: '#8888AA' }, grid: { color: '#2A2A3A' } },
      y: { ticks: { color: '#8888AA' }, grid: { color: '#2A2A3A' }, min: 0, max: 100 }
    }
  };

  // 2. Goal Distribution (Thrust Area)
  const thrustCounts = {};
  stats.sheets.forEach(s => {
    s.goals?.forEach(g => {
      if (g.thrustArea) thrustCounts[g.thrustArea] = (thrustCounts[g.thrustArea] || 0) + 1;
    });
  });

  const donutData = {
    labels: Object.keys(thrustCounts),
    datasets: [{
      data: Object.values(thrustCounts),
      backgroundColor: [
        '#5B5FFF', '#00D4AA', '#FF4757', '#FFA502', '#9B59FF', '#3498db', '#e84393', '#fdcb6e'
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const donutOptions = {
    plugins: { legend: { position: 'right', labels: { color: '#8888AA', boxWidth: 12 } } },
    cutout: '70%'
  };

  // 3. Manager Effectiveness (Check-in Completion Rates)
  const managerData = {};
  const allEmployees = stats.users.filter(u => u.role === 'employee');
  const allManagers = stats.users.filter(u => u.role === 'manager');
  
  // Initialize managers
  allManagers.forEach(m => {
    managerData[m.uid] = { name: m.name, teamSize: 0, completedCheckins: 0 };
  });
  
  // Count team sizes
  allEmployees.forEach(e => {
    if (e.managerId && managerData[e.managerId]) {
      managerData[e.managerId].teamSize += 1;
    }
  });
  
  // Count check-ins (Assume Q1 for now)
  stats.checkins.forEach(c => {
    if (c.quarter === 'Q1') {
      const emp = allEmployees.find(e => e.uid === c.employeeId);
      if (emp && emp.managerId && managerData[emp.managerId]) {
        managerData[emp.managerId].completedCheckins += 1;
      }
    }
  });
  
  const managersWithTeams = Object.values(managerData).filter(m => m.teamSize > 0);
  const managerLabels = managersWithTeams.map(m => m.name);
  const managerRates = managersWithTeams.map(m => Math.round((m.completedCheckins / m.teamSize) * 100));

  const barData = {
    labels: managerLabels.length ? managerLabels : ['Manager A', 'Manager B', 'Manager C'], // fallback
    datasets: [
      {
        label: 'Q1 Check-in Completion Rate (%)',
        data: managerRates.length ? managerRates : [85, 40, 95], // fallback
        backgroundColor: 'rgba(91, 95, 255, 0.8)',
        borderRadius: 4
      }
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#F0F0FF' } } },
    scales: {
      x: { ticks: { color: '#8888AA' }, grid: { display: false } },
      y: { ticks: { color: '#8888AA' }, grid: { color: '#2A2A3A' }, min: 0, max: 100 }
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1>Analytics & Insights</h1>
          <p>Performance trends and organizational health</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={generateAIInsight}
          disabled={loadingInsight}
          style={{ background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)', color: '#111', border: 'none' }}
        >
          {loadingInsight ? <div className="spinner" style={{width: 16, height: 16, borderColor: '#111', borderTopColor: 'transparent'}}/> : <BrainCircuit size={16}/>}
          Generate AI Insights
        </button>
      </div>

      {aiInsight && (
        <div className="card animate-slide-down" style={{ marginBottom: '24px', border: '1px solid #FF9A9E', background: 'linear-gradient(135deg, rgba(255,154,158,0.1) 0%, rgba(254,207,239,0.05) 100%)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#FF9A9E' }}>
            <BrainCircuit size={18}/> Claude API Insights
          </h4>
          <div style={{ whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {aiInsight}
          </div>
        </div>
      )}

      <div className="grid grid-2 gap-lg" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h4><TrendingUp size={18} style={{ display: 'inline' }}/> QoQ Achievement Trend</h4>
          </div>
          <div style={{ height: '300px' }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><PieChart size={18} style={{ display: 'inline' }}/> Goal Distribution by Area</h4>
          </div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
        </div>
      </div>
      
      {/* Manager Effectiveness */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h4><Users size={18} style={{ display: 'inline' }}/> Manager Effectiveness (Check-in Rates)</h4>
        </div>
        <div style={{ height: '300px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
      
    </div>
  );
}
