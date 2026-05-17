import React, { useState } from 'react';
import { app, db, doc, setDoc, collection, serverTimestamp } from '../lib/firebase-config';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Setup() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  const runSetup = async () => {
    setLoading(true);
    setLogs([]);
    addLog('Starting setup...');
    
    // We create a separate auth instance so it doesn't affect the main app auth state as much
    const auth = getAuth(app);
    
    const demoUsers = [
      { email: 'admin@demo.nexus.com', password: 'Demo@1234', name: 'Meera Reddy', role: 'admin', department: 'HR' },
      { email: 'manager@demo.nexus.com', password: 'Demo@1234', name: 'Priya Iyer', role: 'manager', department: 'Engineering' },
      { email: 'employee@demo.nexus.com', password: 'Demo@1234', name: 'Arjun Sharma', role: 'employee', department: 'Engineering' }
    ];

    try {
      const createdUsers = {};
      
      // 1. Create Users
      for (const u of demoUsers) {
        let userUid = null;
        try {
          addLog(`Creating auth user: ${u.email}...`);
          const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
          userUid = cred.user.uid;
          addLog(`✅ Successfully created ${u.email}`);
        } catch(e) {
          if (e.code === 'auth/email-already-in-use') {
             addLog(`User ${u.email} already exists. Logging in to get ID...`);
             const { signInWithEmailAndPassword } = await import('firebase/auth');
             const cred = await signInWithEmailAndPassword(auth, u.email, u.password);
             userUid = cred.user.uid;
             addLog(`✅ Logged in existing user ${u.email}`);
          } else {
             addLog(`❌ Failed to create/login ${u.email}. Error: ${e.message}`);
             continue;
          }
        }
        
        createdUsers[u.role] = userUid;
        
        addLog(`Creating Firestore document for: ${u.name}...`);
        await setDoc(doc(db, 'users', userUid), {
          uid: userUid,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          createdAt: serverTimestamp()
        });
      }

      // Fix up manager IDs if they were created
      if (createdUsers.employee && createdUsers.manager) {
        addLog('Linking employee to manager...');
        await setDoc(doc(db, 'users', createdUsers.employee), { managerId: createdUsers.manager }, { merge: true });
      }

      // 2. Create Goal Cycle
      addLog('Creating Goal Cycle FY2025-26...');
      const cycleRef = doc(db, 'goalCycles', 'FY2025-26');
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      
      await setDoc(cycleRef, {
        cycleId: 'FY2025-26',
        name: 'FY 2025-26',
        goalSettingOpen: now.toISOString().split('T')[0],
        goalSettingClose: nextMonth.toISOString().split('T')[0],
        quarters: {
          Q1: { open: now.toISOString().split('T')[0], close: nextMonth.toISOString().split('T')[0] },
          Q2: { open: '2025-10-01', close: '2025-10-31' },
          Q3: { open: '2026-01-01', close: '2026-01-31' },
          Q4: { open: '2026-03-01', close: '2026-04-30' }
        },
        isActive: true,
        createdBy: createdUsers.admin || 'system',
        createdAt: serverTimestamp()
      });
      addLog('✅ Goal Cycle created');

      addLog('🎉 Setup Complete! You can now log in.');

    } catch (error) {
      addLog(`💥 FATAL ERROR: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }} className="card">
      <h2 style={{ marginBottom: '16px' }}>Database Initialization</h2>
      <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>
        This script will create the Demo users and the active Goal Cycle so you can log in.
      </p>
      
      <button 
        className="btn btn-primary" 
        onClick={runSetup}
        disabled={loading}
      >
        {loading ? 'Running Setup...' : 'Run Setup Script'}
      </button>

      <div style={{ marginTop: '24px', background: '#000', padding: '16px', borderRadius: '8px', minHeight: '200px' }}>
        <h4 style={{ color: '#fff', marginBottom: '12px' }}>Logs</h4>
        {logs.map((log, i) => (
          <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: log.includes('❌') ? '#ff4757' : log.includes('✅') ? '#2ed573' : '#a4b0be', marginBottom: '4px' }}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <div style={{ color: '#555', fontFamily: 'monospace' }}>Waiting...</div>}
      </div>
    </div>
  );
}
