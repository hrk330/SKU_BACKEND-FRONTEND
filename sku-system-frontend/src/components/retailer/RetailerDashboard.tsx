'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ShoppingBagIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { PublishedPrice } from '@/types';

const RetailerDashboard: React.FC = () => {
  const { data: publishedPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['published-prices'],
    queryFn: () => apiClient.getPublishedPrices(),
  });

  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ['skus'],
    queryFn: () => apiClient.getSKUs(),
  });

  const { data: retailers, isLoading: retailersLoading } = useQuery({
    queryKey: ['retailers'],
    queryFn: () => apiClient.getRetailers(),
  });

  const prices = publishedPrices?.data.results || [];
  const totalPrices = prices.length;
  const compliantPrices = prices.filter(price => price.compliant).length;
  const nonCompliantPrices = totalPrices - compliantPrices;
  const complianceRate = totalPrices > 0 ? (compliantPrices / totalPrices) * 100 : 0;

  const recentPrices = prices.slice(0, 5);

  const stats = [
    {
      name: 'Total Published Prices',
      value: totalPrices,
      icon: CurrencyDollarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Compliant Prices',
      value: compliantPrices,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Non-Compliant Prices',
      value: nonCompliantPrices,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'Compliance Rate',
      value: `${complianceRate.toFixed(1)}%`,
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (pricesLoading || skusLoading || retailersLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Retailer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your prices and monitor compliance status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Prices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Price Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPrices.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No prices published yet
                </p>
              ) : (
                recentPrices.map((price) => (
                  <div key={price.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {price.sku.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {price.district.name} • {formatRelativeTime(price.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(price.price)}
                      </span>
                      <Badge 
                        variant={price.compliant ? 'success' : 'danger'}
                        size="sm"
                      >
                        {price.compliant ? 'Compliant' : 'Non-compliant'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full flex items-center p-3 text-left text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <CurrencyDollarIcon className="h-5 w-5 mr-3 text-blue-600" />
                Publish New Price
              </button>
              <button className="w-full flex items-center p-3 text-left text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <ShoppingBagIcon className="h-5 w-5 mr-3 text-green-600" />
                View Product Catalog
              </button>
              <button className="w-full flex items-center p-3 text-left text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <ChartBarIcon className="h-5 w-5 mr-3 text-purple-600" />
                View Compliance Report
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Overall Compliance</span>
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
    </div>
  );
};

export { RetailerDashboard };
