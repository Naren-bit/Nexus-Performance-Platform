import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, doc, getDoc, setDoc, collection, query, where, getDocs, limit, OAuthProvider, signInWithPopup } from './firebase-config.js';

// Login function (with auto-signup for demo purposes)
export async function login(email, password) {
  try {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        // Auto-signup for hackathon demo
        cred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Map known demo emails to proper names, otherwise fallback to capitalized prefix
        let defaultName = email.split('@')[0];
        let defaultRole = 'employee';
        
        if (email === 'employee@demo.nexus.com') { defaultName = 'Arjun Sharma'; defaultRole = 'employee'; }
        else if (email === 'manager@demo.nexus.com') { defaultName = 'Priya Iyer'; defaultRole = 'manager'; }
        else if (email === 'admin@demo.nexus.com') { defaultName = 'Meera Reddy'; defaultRole = 'admin'; }
        else {
          defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        }

        const newUserData = {
          email: email,
          name: defaultName,
          role: defaultRole,
          department: 'Engineering',
          managerId: 'manager_123',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), newUserData);
        return { uid: cred.user.uid, ...newUserData };
      } else {
        throw e;
      }
    }
    
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found.');
    }
    
    const userData = userDoc.data();
    return { uid: cred.user.uid, ...userData };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Microsoft Entra ID (Azure AD) SSO Login & Sync
export async function loginWithMicrosoft() {
  try {
    const provider = new OAuthProvider('microsoft.com');
    // Request additional scopes for Entra ID if needed
    provider.addScope('User.Read');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user exists in our DB
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    let userData;
    if (!userDoc.exists()) {
      // MOCK AZURE AD SYNC: In a real app, you would fetch Microsoft Graph API 
      // or use the SAML/OIDC claims to sync role, department, and hierarchy.
      
      // We simulate reading Azure AD Groups/Attributes here:
      const emailDomain = user.email.split('@')[1] || '';
      const emailPrefix = user.email.split('@')[0].toLowerCase();
      
      let role = 'employee';
      let department = 'Engineering';
      let managerId = 'manager_uid_placeholder'; // Mock hierarchy
      
      if (emailPrefix.includes('admin') || emailPrefix.includes('hr')) {
        role = 'admin';
        department = 'Human Resources';
      } else if (emailPrefix.includes('manager') || emailPrefix.includes('lead')) {
        role = 'manager';
        department = 'Sales'; // just an example
      }
      
      userData = {
        name: user.displayName || emailPrefix,
        email: user.email,
        role: role,
        department: department,
        managerId: role === 'employee' ? 'manager_uid_placeholder' : null,
        azureAdSync: true, // Flag indicating it came from Entra ID
        createdAt: new Date()
      };
      
      await setDoc(userRef, userData);
    } else {
      userData = userDoc.data();
    }
    
    return { uid: user.uid, ...userData };
  } catch (error) {
    console.error('Microsoft SSO Login error:', error);
    throw error;
  }
}

// Logout function
export async function logout() {
  await firebaseSignOut(auth);
}

// Get user profile
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? { uid, ...userDoc.data() } : null;
}

// Get active cycle
export async function getActiveCycle() {
  try {
    const q = query(collection(db, 'goalCycles'), where('isActive', '==', true), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, cycleId: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error fetching active cycle:', error);
    return null;
  }
}

// Current auth state listener (for React hook)
export function onAuthChange(callback) {
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      callback({ ...user, ...profile });
    } else {
      callback(null);
    }
  });
}
