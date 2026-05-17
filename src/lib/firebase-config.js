import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyADSVWVNzqqrGlfqcBZXKoi3KIION8Rydg",
  authDomain: "atomquest-portal-10492.firebaseapp.com",
  projectId: "atomquest-portal-10492",
  storageBucket: "atomquest-portal-10492.firebasestorage.app",
  messagingSenderId: "3110499394",
  appId: "1:3110499394:web:f40e2ecb5486f1d400a9db",
  measurementId: "G-RHQSQLSRMD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  app, auth, db,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, OAuthProvider, signInWithPopup,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch, serverTimestamp, onSnapshot, Timestamp
};
