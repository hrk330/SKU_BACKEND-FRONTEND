'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const CatalogPage: React.FC = () => {
  const { data: skus, isLoading } = useQuery({
    queryKey: ['skus'],
    queryFn: () => apiClient.getSKUs(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse available fertilizer products
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skus?.data.results.map((sku) => (
          <Card key={sku.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{sku.name}</CardTitle>
              <Badge variant="outline">{sku.category}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Unit:</span> {sku.unit}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Code:</span> {sku.code}
                </p>
                {sku.description && (
                  <p className="text-sm text-gray-500">{sku.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {skus?.data.results.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No products available in the catalog.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const CatalogPageWrapper: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['retailer']}>
      <DashboardLayout>
        <CatalogPage />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default CatalogPageWrapper;
