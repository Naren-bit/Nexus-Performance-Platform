import { db, doc, updateDoc, writeBatch, collection, serverTimestamp } from './firebase-config.js';

export async function approveGoalSheet(sheetId, managerId, comment = '', updatedGoals = null, totalWeightage = null) {
  try {
    const batch = writeBatch(db);

    // 1. Lock the goal sheet and potentially update goals if inline edits were made
    const sheetRef = doc(db, 'goalSheets', sheetId);
    
    const updateData = {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: managerId,
      lockedAt: serverTimestamp(),
      managerComment: comment
    };
    
    if (updatedGoals) {
      updateData.goals = updatedGoals;
      updateData.totalWeightage = totalWeightage;
    }

    batch.update(sheetRef, updateData);

    // 2. Write audit log
    const auditRef = doc(collection(db, 'auditLog'));
    batch.set(auditRef, {
      action: 'goal_sheet_approved',
      targetId: sheetId,
      performedBy: managerId,
      performedByRole: 'manager',
      timestamp: serverTimestamp(),
      reason: comment || 'Manager approved goals'
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error approving goal sheet:', error);
    throw error;
  }
}

export async function returnGoalSheet(sheetId, managerId, comment) {
  try {
    const batch = writeBatch(db);

    const sheetRef = doc(db, 'goalSheets', sheetId);
    batch.update(sheetRef, {
      status: 'returned',
      managerComment: comment,
      updatedAt: serverTimestamp()
    });

    const auditRef = doc(collection(db, 'auditLog'));
    batch.set(auditRef, {
      action: 'goal_sheet_returned',
      targetId: sheetId,
      performedBy: managerId,
      performedByRole: 'manager',
      timestamp: serverTimestamp(),
      reason: comment
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error returning goal sheet:', error);
    throw error;
  }
}
