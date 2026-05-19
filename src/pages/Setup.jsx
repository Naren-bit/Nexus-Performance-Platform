import React, { useState } from 'react';
import { app, db, doc, setDoc, collection, addDoc, serverTimestamp } from '../lib/firebase-config';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Setup() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  const runSetup = async () => {
    setLoading(true);
    setLogs([]);
    addLog('Starting setup...');
    
    const auth = getAuth(app);
    
    const demoUsers = [
      { email: 'admin@demo.nexus.com', password: 'Demo@1234', name: 'Meera Reddy', role: 'admin', department: 'HR' },
      { email: 'manager@demo.nexus.com', password: 'Demo@1234', name: 'Priya Iyer', role: 'manager', department: 'Engineering' },
      { email: 'employee@demo.nexus.com', password: 'Demo@1234', name: 'Arjun Sharma', role: 'employee', department: 'Engineering' },
      { email: 'employee2@demo.nexus.com', password: 'Demo@1234', name: 'Kavitha Nair', role: 'employee', department: 'Engineering' },
      { email: 'employee3@demo.nexus.com', password: 'Demo@1234', name: 'Ravi Kumar', role: 'employee', department: 'HR' }
    ];

    try {
      const createdUsers = {};
      const employeeUids = [];
      
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
        
        if (u.role === 'employee') employeeUids.push({ uid: userUid, name: u.name, department: u.department });
        createdUsers[u.role] = createdUsers[u.role] || userUid;
        
        addLog(`Creating Firestore document for: ${u.name}...`);
        await setDoc(doc(db, 'users', userUid), {
          uid: userUid,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          managerId: u.role === 'employee' ? (createdUsers.manager || null) : null,
          createdAt: serverTimestamp()
        });
      }

      // Link all employees to the manager
      if (createdUsers.manager) {
        for (const emp of employeeUids) {
          addLog(`Linking ${emp.name} to manager...`);
          await setDoc(doc(db, 'users', emp.uid), { managerId: createdUsers.manager }, { merge: true });
        }
      }

      // 2. Create Goal Cycle with Time Machine–ready dates
      addLog('Creating Goal Cycle FY2025-26...');
      const cycleRef = doc(db, 'goalCycles', 'FY2025-26');
      const now = new Date();
      const fmt = (d) => d.toISOString().split('T')[0];
      const past = (days) => { const d = new Date(now); d.setDate(d.getDate() - days); return fmt(d); };
      const future = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); return fmt(d); };
      
      await setDoc(cycleRef, {
        cycleId: 'FY2025-26',
        name: 'FY 2025-26',
        goalSettingOpen: past(20),
        goalSettingClose: past(5),
        quarters: {
          Q1: { open: past(3), close: future(10) },
          Q2: { open: future(20), close: future(30) },
          Q3: { open: future(40), close: future(50) },
          Q4: { open: future(60), close: future(70) }
        },
        isActive: true,
        createdBy: createdUsers.admin || 'system',
        createdAt: serverTimestamp()
      });
      addLog('✅ Goal Cycle created (Q1 Check-in window is OPEN)');

      // 3. Seed Goal Sheets with real achievement data
      addLog('Creating pre-populated goal sheets...');
      const cycleId = 'FY2025-26';
      const managerId = createdUsers.manager;

      // --- Employee 1 (Arjun): Approved sheet with Q1 achievements ---
      if (employeeUids[0]) {
        const emp = employeeUids[0];
        const sheetId = `seed_sheet_${emp.uid}`;
        await setDoc(doc(db, 'goalSheets', sheetId), {
          employeeId: emp.uid,
          employeeName: emp.name,
          managerId: managerId,
          cycleId: cycleId,
          department: emp.department,
          status: 'approved',
          approvedBy: managerId,
          approvedAt: serverTimestamp(),
          lockedAt: serverTimestamp(),
          managerComment: 'Well-structured goals aligned with thrust areas. Approved.',
          totalWeightage: 100,
          goals: [
            {
              id: 'g_seed_1', title: 'Increase API throughput by 40%', thrustArea: 'Operational Excellence',
              uom: 'percent', uomDirection: 'min', target: 40, weightage: 30,
              achievements: { Q1: { actual: 28, comment: 'Optimized DB queries, 28% improvement so far', updatedAt: serverTimestamp() } },
              computedScores: { Q1: 0.70 }
            },
            {
              id: 'g_seed_2', title: 'Deliver customer onboarding module', thrustArea: 'Customer Success',
              uom: 'timeline', target: future(60), weightage: 25,
              achievements: { Q1: { actual: fmt(now), comment: 'Phase 1 wireframes and API spec delivered on time', updatedAt: serverTimestamp() } },
              computedScores: { Q1: 1.0 }
            },
            {
              id: 'g_seed_3', title: 'Reduce production incidents to zero', thrustArea: 'Quality',
              uom: 'zero', target: 0, weightage: 20,
              achievements: { Q1: { actual: 1, comment: 'One minor P3 incident in March. RCA completed.', updatedAt: serverTimestamp() } },
              computedScores: { Q1: 0.0 }
            },
            {
              id: 'g_seed_4', title: 'Complete 3 innovation prototypes', thrustArea: 'Innovation',
              uom: 'numeric', uomDirection: 'min', target: 3, weightage: 25,
              achievements: { Q1: { actual: 1, comment: 'Completed AI-powered search prototype', updatedAt: serverTimestamp() } },
              computedScores: { Q1: 0.33 }
            }
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addLog(`✅ Approved goal sheet for ${emp.name} (with Q1 check-in data)`);

        // Seed a Q1 check-in record
        await addDoc(collection(db, 'checkins'), {
          sheetId: sheetId,
          employeeId: emp.uid,
          managerId: managerId,
          quarter: 'Q1',
          cycleId: cycleId,
          managerComment: 'Good progress on API optimization. Keep pushing on innovation targets.',
          completedAt: serverTimestamp()
        });
        addLog('✅ Q1 check-in record seeded');
      }

      // --- Employee 2 (Kavitha): Submitted sheet (pending approval) ---
      if (employeeUids[1]) {
        const emp = employeeUids[1];
        const sheetId = `seed_sheet_${emp.uid}`;
        await setDoc(doc(db, 'goalSheets', sheetId), {
          employeeId: emp.uid,
          employeeName: emp.name,
          managerId: managerId,
          cycleId: cycleId,
          department: emp.department,
          status: 'submitted',
          submittedAt: serverTimestamp(),
          totalWeightage: 100,
          goals: [
            {
              id: 'g_seed_5', title: 'Grow enterprise revenue by 20%', thrustArea: 'Revenue Growth',
              uom: 'percent', uomDirection: 'min', target: 20, weightage: 35
            },
            {
              id: 'g_seed_6', title: 'Achieve 95% customer satisfaction score', thrustArea: 'Customer Success',
              uom: 'percent', uomDirection: 'min', target: 95, weightage: 30
            },
            {
              id: 'g_seed_7', title: 'Reduce deployment time to under 15 minutes', thrustArea: 'Operational Excellence',
              uom: 'numeric', uomDirection: 'max', target: 15, weightage: 35
            }
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addLog(`✅ Submitted goal sheet for ${emp.name} (pending manager approval)`);
      }

      // --- Employee 3 (Ravi, HR dept): Draft sheet ---
      if (employeeUids[2]) {
        const emp = employeeUids[2];
        const sheetId = `seed_sheet_${emp.uid}`;
        await setDoc(doc(db, 'goalSheets', sheetId), {
          employeeId: emp.uid,
          employeeName: emp.name,
          managerId: managerId,
          cycleId: cycleId,
          department: emp.department,
          status: 'draft',
          totalWeightage: 60,
          goals: [
            {
              id: 'g_seed_8', title: 'Launch new compliance training program', thrustArea: 'Compliance & Risk',
              uom: 'timeline', target: '2026-03-31', weightage: 30
            },
            {
              id: 'g_seed_9', title: 'Reduce employee attrition below 8%', thrustArea: 'People & Culture',
              uom: 'percent', uomDirection: 'max', target: 8, weightage: 30
            }
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addLog(`✅ Draft goal sheet for ${emp.name} (HR department)`);
      }

      // 4. Seed Audit Log entries
      addLog('Seeding audit trail entries...');
      const auditEntries = [
        { action: 'goal_sheet_submitted', targetId: `seed_sheet_${employeeUids[0]?.uid}`, performedBy: employeeUids[0]?.uid || 'unknown', performedByRole: 'employee', reason: 'Employee submitted annual goals for review' },
        { action: 'goal_sheet_approved', targetId: `seed_sheet_${employeeUids[0]?.uid}`, performedBy: managerId, performedByRole: 'manager', reason: 'Well-structured goals aligned with thrust areas. Approved.' },
        { action: 'goal_sheet_submitted', targetId: `seed_sheet_${employeeUids[1]?.uid}`, performedBy: employeeUids[1]?.uid || 'unknown', performedByRole: 'employee', reason: 'Goals submitted for manager review' },
        { action: 'checkin_completed', targetId: `seed_sheet_${employeeUids[0]?.uid}`, performedBy: managerId, performedByRole: 'manager', reason: 'Q1 quarterly check-in reviewed and signed off' },
        { action: 'cycle_created', targetId: 'FY2025-26', performedBy: createdUsers.admin || 'system', performedByRole: 'admin', reason: 'FY 2025-26 performance cycle initiated' }
      ];
      for (const entry of auditEntries) {
        await addDoc(collection(db, 'auditLog'), { ...entry, timestamp: serverTimestamp() });
      }
      addLog('✅ 5 audit log entries seeded');

      addLog('');
      addLog('🎉 FULL SETUP COMPLETE!');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('📊 5 users created (1 Admin, 1 Manager, 3 Employees)');
      addLog('📋 3 goal sheets seeded (1 Approved + Q1, 1 Submitted, 1 Draft)');
      addLog('✅ 1 check-in record (Q1) with manager review');
      addLog('📝 5 audit trail entries');
      addLog('⏰ Q1 check-in window is OPEN for demo');
      addLog('');
      addLog('Login credentials: any role @ Demo@1234');

    } catch (error) {
      addLog(`💥 FATAL ERROR: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }} className="card">
      <h2 style={{ marginBottom: '16px' }}>Database Initialization</h2>
      <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>
        This script creates demo users, an active Goal Cycle, pre-populated goal sheets with Q1 achievement data, check-in records, and audit trail entries — ensuring a fully populated demo from day one.
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
          <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: log.includes('❌') || log.includes('💥') ? '#ff4757' : log.includes('✅') || log.includes('🎉') ? '#2ed573' : log.includes('━') ? '#5B5FFF' : '#a4b0be', marginBottom: '4px' }}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <div style={{ color: '#555', fontFamily: 'monospace' }}>Waiting...</div>}
      </div>
    </div>
  );
}
