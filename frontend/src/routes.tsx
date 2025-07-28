import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AvailableNodes } from './pages/AvailableNodes';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './components/AdminDashboard';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/nodes" 
        element={
          <ProtectedRoute>
            <AvailableNodes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}; 