import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import GoalsCreate from './pages/GoalsCreate';
import Checkin from './pages/Checkin';
import Analytics from './pages/Analytics';
import Setup from './pages/Setup';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            
            <Route element={<Layout />}>
              {/* Employee Routes */}
              <Route 
                path="/dashboard-employee" 
                element={
                  <ProtectedRoute allowedRoles={['employee']}>
                    <EmployeeDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/goals-create" 
                element={
                  <ProtectedRoute allowedRoles={['employee']}>
                    <GoalsCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/checkin" 
                element={
                  <ProtectedRoute allowedRoles={['employee', 'manager']}>
                    <Checkin />
                  </ProtectedRoute>
                } 
              />

              {/* Manager Routes */}
              <Route 
                path="/dashboard-manager" 
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Admin Routes */}
              <Route 
                path="/dashboard-admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Shared Routes */}
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <Analytics />
                  </ProtectedRoute>
                } 
              />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
