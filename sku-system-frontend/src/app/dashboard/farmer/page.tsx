'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { FarmerDashboard } from '@/components/farmer/FarmerDashboard';

const FarmerDashboardPage: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['farmer']}>
      <DashboardLayout>
        <FarmerDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default FarmerDashboardPage;