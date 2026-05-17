import { db, collection, doc, updateDoc, getDocs, query, where, addDoc, serverTimestamp } from './firebase-config.js';

export async function saveAchievement(sheetId, goalIndex, quarter, actual, comment) {
  try {
    const sheetRef = doc(db, 'goalSheets', sheetId);
    
    // We update the specific nested field using dot notation
    const updates = {
      [`goals.${goalIndex}.achievements.${quarter}.actual`]: actual,
      [`goals.${goalIndex}.achievements.${quarter}.comment`]: comment,
      [`goals.${goalIndex}.achievements.${quarter}.updatedAt`]: serverTimestamp()
    };
    
    await updateDoc(sheetRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving achievement:', error);
    throw error;
  }
}

export async function getCheckins(employeeId, cycleId) {
  try {
    const q = query(
      collection(db, 'checkins'),
      where('employeeId', '==', employeeId),
      where('cycleId', '==', cycleId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching checkins:', error);
    return [];
  }
}

export async function completeCheckin(sheetId, employeeId, managerId, quarter, cycleId, comment) {
  try {
    const checkinRef = collection(db, 'checkins');
    await addDoc(checkinRef, {
      sheetId,
      employeeId,
      managerId,
      quarter,
      cycleId,
      managerComment: comment,
      completedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error completing checkin:', error);
    throw error;
  }
}
