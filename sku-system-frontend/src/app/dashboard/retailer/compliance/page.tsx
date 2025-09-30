'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

const CompliancePage: React.FC = () => {
  const { data: publishedPrices, isLoading } = useQuery({
    queryKey: ['published-prices'],
    queryFn: () => apiClient.getPublishedPrices(),
  });

  const prices = publishedPrices?.data.results || [];
  const totalPrices = prices.length;
  const compliantPrices = prices.filter(price => price.compliant).length;
  const nonCompliantPrices = totalPrices - compliantPrices;
  const complianceRate = totalPrices > 0 ? (compliantPrices / totalPrices) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Report</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your price compliance status
        </p>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalPrices}</div>
              <div className="text-sm text-gray-500">Total Prices</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{compliantPrices}</div>
              <div className="text-sm text-gray-500">Compliant</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{nonCompliantPrices}</div>
              <div className="text-sm text-gray-500">Non-Compliant</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Compliance Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {complianceRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  complianceRate >= 80 ? 'bg-green-600' : 
                  complianceRate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Details */}
      <Card>
        <CardHeader>
          <CardTitle>Price Compliance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prices.map((price) => (
              <div key={price.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{price.sku.name}</p>
                  <p className="text-sm text-gray-500">
                    {price.district.name} • {formatRelativeTime(price.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(price.price)}
                  </span>
                  <Badge variant={price.compliant ? 'success' : 'danger'}>
                    {price.compliant ? 'Compliant' : 'Non-compliant'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CompliancePageWrapper: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['retailer']}>
      <DashboardLayout>
        <CompliancePage />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default CompliancePageWrapper;
