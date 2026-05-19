import { db, collection, doc, setDoc, updateDoc, writeBatch, getDocs, query, where, orderBy, limit, serverTimestamp } from './firebase-config.js';
import { getAllGoalSheets, getAllUsers } from './goals.js';
import { getCheckins } from './checkin.js';

export async function createCycle(data) {
  try {
    const cycleRef = doc(db, 'goalCycles', data.cycleId);
    await setDoc(cycleRef, {
      ...data,
      isActive: true,
      createdAt: serverTimestamp()
    });

    // Make other cycles inactive
    const snapshot = await getDocs(collection(db, 'goalCycles'));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      if (d.id !== data.cycleId && d.data().isActive) {
        batch.update(d.ref, { isActive: false });
      }
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error creating cycle:', error);
    throw error;
  }
}

export async function unlockGoalSheet(sheetId, adminId, reason) {
  try {
    const batch = writeBatch(db);

    const sheetRef = doc(db, 'goalSheets', sheetId);
    batch.update(sheetRef, {
      status: 'draft',
      lockedAt: null,
      updatedAt: serverTimestamp()
    });

    const auditRef = doc(collection(db, 'auditLog'));
    batch.set(auditRef, {
      action: 'goal_unlocked',
      targetId: sheetId,
      performedBy: adminId,
      performedByRole: 'admin',
      timestamp: serverTimestamp(),
      reason: reason
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error unlocking sheet:', error);
    throw error;
  }
}

export async function getAuditLogs(max = 50) {
  try {
    const q = query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

export async function getOrgStats(cycleId, user) {
  try {
    let users = await getAllUsers();
    let sheets = [];
    
    if (user.role === 'admin') {
      sheets = await getAllGoalSheets(cycleId);
    } else if (user.role === 'manager') {
      users = users.filter(u => u.managerId === user.uid);
      sheets = await getTeamGoalSheets(user.uid, cycleId);
    } else {
      return null;
    }

    const checkinsQ = query(collection(db, 'checkins'), where('cycleId', '==', cycleId));
    const checkinsSnap = await getDocs(checkinsQ);
    let checkins = checkinsSnap.docs.map(d => d.data());

    if (user.role === 'manager') {
      // Only keep checkins for the manager's team
      const teamUids = users.map(u => u.uid);
      checkins = checkins.filter(c => teamUids.includes(c.employeeId));
    }

    const totalEmployees = users.filter(u => u.role === 'employee').length;
    const submittedSheets = sheets.filter(s => s.status === 'submitted' || s.status === 'approved');
    const approvedSheets = sheets.filter(s => s.status === 'approved');

    const submittedCount = submittedSheets.length;
    const approvalRate = submittedCount > 0 ? Math.round((approvedSheets.length / submittedCount) * 100) : 0;
    const checkinsCount = checkins.length;

    // Heatmap data
    const departments = {};
    users.filter(u => u.role === 'employee').forEach(u => {
      const dept = u.department || 'Other';
      if (!departments[dept]) departments[dept] = { total: 0, draft: 0, submitted: 0, approved: 0, returned: 0, notStarted: 0 };
      departments[dept].total++;
      
      const sheet = sheets.find(s => s.employeeId === u.uid);
      if (!sheet) {
        departments[dept].notStarted++;
      } else {
        if (departments[dept][sheet.status] !== undefined) {
          departments[dept][sheet.status]++;
        }
      }
    });

    return { totalEmployees, submittedCount, approvalRate, checkinsCount, departments, sheets, users, checkins };
  } catch (error) {
    console.error('Error computing org stats:', error);
    return null;
  }
}

export async function fastForwardCycle(cycleId, phase) {
  try {
    const cycleRef = doc(db, 'goalCycles', cycleId);
    const today = new Date();
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    const past = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return formatDate(d);
    };
    
    const future = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return formatDate(d);
    };

    let dates = {};
    if (phase === 'goal_setting') {
      dates = {
        goalSettingOpen: past(5),
        goalSettingClose: future(5),
        quarters: {
          Q1: { open: future(10), close: future(20) },
          Q2: { open: future(30), close: future(40) },
          Q3: { open: future(50), close: future(60) },
          Q4: { open: future(70), close: future(80) }
        }
      };
    } else if (phase === 'Q1') {
      dates = {
        goalSettingOpen: past(20),
        goalSettingClose: past(10),
        quarters: {
          Q1: { open: past(5), close: future(5) },
          Q2: { open: future(10), close: future(20) },
          Q3: { open: future(30), close: future(40) },
          Q4: { open: future(50), close: future(60) }
        }
      };
    } else if (phase === 'Q2') {
      dates = {
        goalSettingOpen: past(30),
        goalSettingClose: past(20),
        quarters: {
          Q1: { open: past(15), close: past(10) },
          Q2: { open: past(5), close: future(5) },
          Q3: { open: future(10), close: future(20) },
          Q4: { open: future(30), close: future(40) }
        }
      };
    } else if (phase === 'Q3') {
      dates = {
        goalSettingOpen: past(40),
        goalSettingClose: past(30),
        quarters: {
          Q1: { open: past(25), close: past(20) },
          Q2: { open: past(15), close: past(10) },
          Q3: { open: past(5), close: future(5) },
          Q4: { open: future(10), close: future(20) }
        }
      };
    } else if (phase === 'Q4') {
      dates = {
        goalSettingOpen: past(50),
        goalSettingClose: past(40),
        quarters: {
          Q1: { open: past(35), close: past(30) },
          Q2: { open: past(25), close: past(20) },
          Q3: { open: past(15), close: past(10) },
          Q4: { open: past(5), close: future(5) }
        }
      };
    }

    await updateDoc(cycleRef, dates);
    return true;
  } catch (error) {
    console.error('Error fast-forwarding cycle:', error);
    throw error;
  }
}
