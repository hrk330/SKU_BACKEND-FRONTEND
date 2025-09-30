'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PriceManagement } from '@/components/retailer/PriceManagement';

const PriceManagementPage: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['retailer']}>
      <DashboardLayout>
        <PriceManagement />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default PriceManagementPage;
