import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, writeBatch, serverTimestamp } from './firebase-config.js';

// Get a goal sheet for an employee and cycle
export async function getGoalSheet(employeeId, cycleId) {
  try {
    const q = query(
      collection(db, 'goalSheets'),
      where('employeeId', '==', employeeId),
      where('cycleId', '==', cycleId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    console.error('Error getting goal sheet:', error);
    return null;
  }
}

// Save goal sheet as draft
export async function saveGoalSheet(sheetData) {
  try {
    const dataToSave = {
      ...sheetData,
      updatedAt: serverTimestamp()
    };
    
    if (!dataToSave.createdAt) {
      dataToSave.createdAt = serverTimestamp();
    }

    let docRef;
    if (sheetData.id) {
      docRef = doc(db, 'goalSheets', sheetData.id);
      await updateDoc(docRef, dataToSave);
      return sheetData.id;
    } else {
      docRef = doc(collection(db, 'goalSheets'));
      await setDoc(docRef, dataToSave);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving goal sheet:', error);
    throw error;
  }
}

// Submit goal sheet for approval
export async function submitGoalSheet(sheetId) {
  try {
    const docRef = doc(db, 'goalSheets', sheetId);
    await updateDoc(docRef, {
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error submitting goal sheet:', error);
    throw error;
  }
}

// Get team members for a manager
export async function getTeamMembers(managerId) {
  try {
    const q = query(collection(db, 'users'), where('managerId', '==', managerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

// Get team goal sheets for a specific cycle
export async function getTeamGoalSheets(managerId, cycleId) {
  try {
    const q = query(
      collection(db, 'goalSheets'),
      where('managerId', '==', managerId),
      where('cycleId', '==', cycleId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching team goal sheets:', error);
    return [];
  }
}

// Get all goal sheets for admin
export async function getAllGoalSheets(cycleId) {
  try {
    const q = query(collection(db, 'goalSheets'), where('cycleId', '==', cycleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching all goal sheets:', error);
    return [];
  }
}

export async function getAllUsers() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

// Push a shared goal to all team members
export async function pushSharedGoalToTeam(managerId, cycleId, teamMembers, goalData) {
  try {
    const batch = writeBatch(db);
    const sharedId = `shared_${Date.now()}`;
    const newGoal = {
      ...goalData,
      id: sharedId,
      isShared: true,
      sharedOwnerId: managerId,
      weightage: 10,
      achievement: 0
    };
    for (const member of teamMembers) {
      let sheetQ;
      if (member.managerId && member.managerId !== managerId) {
        sheetQ = query(
          collection(db, 'goalSheets'),
          where('employeeId', '==', member.uid),
          where('cycleId', '==', cycleId)
        );
      } else {
        sheetQ = query(
          collection(db, 'goalSheets'),
          where('employeeId', '==', member.uid),
          where('managerId', '==', managerId),
          where('cycleId', '==', cycleId)
        );
      }
      const snap = await getDocs(sheetQ);
      if (!snap.empty) {
        const sheetDoc = snap.docs[0];
        const existingGoals = sheetDoc.data().goals || [];
        const hasGoalId = existingGoals.find(g => g.id === sharedId);
        
        if (!hasGoalId) {
          const currentStatus = sheetDoc.data().status || 'draft';
          const newStatus = (currentStatus === 'approved' || currentStatus === 'submitted') ? 'draft' : currentStatus;
          batch.update(sheetDoc.ref, {
            goals: [...existingGoals, newGoal],
            status: newStatus,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        const sheetRef = doc(collection(db, 'goalSheets'));
        batch.set(sheetRef, {
          employeeId: member.uid,
          employeeName: member.name,
          managerId: member.managerId || managerId,
          cycleId: cycleId,
          department: member.department,
          status: 'draft',
          goals: [newGoal],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error pushing shared goal:', error);
    throw error;
  }
}

export async function syncSharedGoalAchievement(managerId, cycleId, sharedGoalTitle, newAchievement) {
  try {
    const q = query(
      collection(db, 'goalSheets'),
      where('managerId', '==', managerId),
      where('cycleId', '==', cycleId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(sheetDoc => {
      const data = sheetDoc.data();
      let updated = false;
      const newGoals = (data.goals || []).map(g => {
        if (g.isShared && g.title === sharedGoalTitle) {
          updated = true;
          return { ...g, achievement: newAchievement };
        }
        return g;
      });
      if (updated) batch.update(sheetDoc.ref, { goals: newGoals });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error syncing shared goal:', error);
    throw error;
  }
}

export async function syncPrimaryOwnerAchievement(cycleId, sharedGoalId, quarter, actualValue, commentValue) {
  try {
    const q = query(
      collection(db, 'goalSheets'),
      where('cycleId', '==', cycleId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;
    
    snap.docs.forEach(sheetDoc => {
      const data = sheetDoc.data();
      let updated = false;
      
      const newGoals = (data.goals || []).map(g => {
        if (g.isShared && g.id === sharedGoalId) {
          updated = true;
          
          const achievements = g.achievements || {};
          achievements[quarter] = { actual: actualValue, comment: commentValue };
          
          const computedScores = g.computedScores || {};
          const targetNum = Number(g.target) || 1;
          const actualNum = Number(actualValue) || 0;
          let newScore = 0;
          
          if (g.uom === 'numeric' || g.uom === 'percentage' || g.uom === 'percent') {
            if (g.uomDirection === 'max') {
              newScore = actualNum === 0 ? 0 : targetNum / actualNum;
            } else {
              newScore = targetNum === 0 ? 0 : actualNum / targetNum;
            }
          } else if (g.uom === 'zero') {
            newScore = actualNum === 0 ? 1 : 0;
          } else if (g.uom === 'timeline') {
            newScore = actualValue === g.target ? 1 : 0;
          }
          
          newScore = Math.min(1.0, Math.max(0.0, newScore));
          computedScores[quarter] = newScore;
          
          return { ...g, achievements, computedScores };
        }
        return g;
      });
      
      if (updated) {
        batch.update(sheetDoc.ref, { 
          goals: newGoals,
          updatedAt: serverTimestamp()
        });
        count++;
      }
    });
    
    await batch.commit();
    console.log(`Successfully synced primary owner achievements to ${count} sheets`);
    return true;
  } catch (error) {
    console.error('Error syncing primary owner achievements:', error);
    throw error;
  }
}
