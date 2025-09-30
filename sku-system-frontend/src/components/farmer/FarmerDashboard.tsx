'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  HeartIcon, 
  BellIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ComplaintRegistration } from './ComplaintRegistration';
import { MyComplaints } from './MyComplaints';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { FarmerPriceQuery, SKU, District, ComplaintStatistics } from '@/types';

const FarmerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    sku_id: '',
    district_id: '',
  });
  const [activeTab, setActiveTab] = useState<'search' | 'complaints'>('search');

  // Handle hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#complaints') {
      setActiveTab('complaints');
    }
  }, []);

  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ['skus'],
    queryFn: () => apiClient.getSKUs(),
  });

  const { data: districts, isLoading: districtsLoading } = useQuery({
    queryKey: ['districts'],
    queryFn: () => apiClient.getDistricts(),
  });

  const { data: priceQuery, isLoading: priceLoading } = useQuery({
    queryKey: ['farmer-prices', searchParams],
    queryFn: () => apiClient.getFarmerPrices(searchParams),
    enabled: !!(searchParams.sku_id && searchParams.district_id),
  });

  const { data: complaintStats } = useQuery({
    queryKey: ['complaint-statistics'],
    queryFn: () => apiClient.getComplaintStatistics(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is triggered automatically by the query
  };

  const quickActions = [
    {
      name: 'Search Prices',
      description: 'Find the best prices for your products',
      icon: MagnifyingGlassIcon,
      action: () => setActiveTab('search'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'File Complaint',
      description: 'Report price violations',
      icon: ExclamationTriangleIcon,
      action: () => setActiveTab('complaints'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'My Complaints',
      description: 'Track your submitted complaints',
      icon: DocumentTextIcon,
      action: () => setActiveTab('complaints'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Compare Prices',
      description: 'Compare prices across retailers',
      icon: ChartBarIcon,
      href: '/dashboard/farmer/comparison',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  const recentSearches = [
    { product: 'Urea 46-0-0', district: 'Sample District', price: 1200, date: '2 hours ago' },
    { product: 'DAP 18-46-0', district: 'Sample District', price: 1850, date: '1 day ago' },
    { product: 'Potash 0-0-60', district: 'Sample District', price: 1250, date: '2 days ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Farmer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find the best prices for your agricultural products and report violations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Price Search
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'complaints'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Complaints
            {complaintStats?.data && complaintStats.data.pending_complaints > 0 && (
              <Badge variant="danger" size="sm" className="ml-2">
                {complaintStats.data.pending_complaints}
              </Badge>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <>
          {/* Quick Search */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Price Search</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <select
                      value={searchParams.sku_id}
                      onChange={(e) => setSearchParams({ ...searchParams, sku_id: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a product</option>
                      {skus?.data.results.map((sku: SKU) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District
                    </label>
                    <select
                      value={searchParams.district_id}
                      onChange={(e) => setSearchParams({ ...searchParams, district_id: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a district</option>
                      {districts?.data.results.map((district: District) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!searchParams.sku_id || !searchParams.district_id}
                  leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                >
                  Search Prices
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Results */}
          {priceQuery && (
            <Card>
              <CardHeader>
                <CardTitle>Price Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="text-lg font-medium text-blue-900">
                      {priceQuery.data.sku.name}
                    </h3>
                    <p className="text-sm text-blue-700">
                      Reference Price: {formatCurrency(priceQuery.data.reference_price.price)}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Retailer Prices</h4>
                    {priceQuery.data.retailer_prices.slice(0, 3).map((price, index) => (
                      <div key={price.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium text-gray-900">
                            {price.retailer.business_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {price.retailer.district.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900">
                            {formatCurrency(price.price)}
                          </p>
                          <Badge variant={price.compliant ? 'success' : 'danger'} size="sm">
                            {price.compliant ? 'Compliant' : 'Non-compliant'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'complaints' && (
        <div id="complaints" className="space-y-6">
          {/* Complaint Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Complaint Management</h2>
              <p className="text-gray-600">Report price violations and track your complaints</p>
            </div>
            <ComplaintRegistration onSuccess={() => {
              // Refresh complaint data
            }} />
          </div>

          {/* Complaint Statistics */}
          {complaintStats?.data && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-md">
                      <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                      <p className="text-2xl font-bold text-gray-900">{complaintStats.data.total_complaints}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-md">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{complaintStats.data.pending_complaints}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-md">
                      <EyeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Under Review</p>
                      <p className="text-2xl font-bold text-gray-900">{complaintStats.data.under_review}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-md">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Resolved</p>
                      <p className="text-2xl font-bold text-gray-900">{complaintStats.data.resolved_complaints}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* My Complaints */}
          <MyComplaints />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Card 
            key={action.name} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={action.action}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${action.bgColor}`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">{action.name}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Searches */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSearches.map((search, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{search.product}</p>
                    <p className="text-xs text-gray-500">{search.district} • {search.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(search.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Price Trend</span>
                <span className="text-sm font-medium text-green-600">↗ +2.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Best Deals Available</span>
                <span className="text-sm font-medium text-blue-600">3 retailers</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Compliance Rate</span>
                <span className="text-sm font-medium text-green-600">85%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { FarmerDashboard };
