'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RetailerDashboard } from '@/components/retailer/RetailerDashboard';

const RetailerDashboardPage: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['retailer']}>
      <DashboardLayout>
        <RetailerDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default RetailerDashboardPage;
