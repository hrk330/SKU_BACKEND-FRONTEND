'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    district: '',
    sku: '',
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: () => apiClient.getDistricts(),
  });

  const { data: skus } = useQuery({
    queryKey: ['skus'],
    queryFn: () => apiClient.getSKUs(),
  });

  const { data: publishedPrices, isLoading } = useQuery({
    queryKey: ['published-prices', searchParams],
    queryFn: () => apiClient.getPublishedPrices(searchParams),
    enabled: searchParams.district !== '' || searchParams.sku !== '',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically refetch when searchParams change
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchParams({
      ...searchParams,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Prices</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find fertilizer prices in your area
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  name="district"
                  value={searchParams.district}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Districts</option>
                  {districts?.data.results.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  name="sku"
                  value={searchParams.sku}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Products</option>
                  {skus?.data.results.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Search Prices
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Search Results
              {publishedPrices?.data.results && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({publishedPrices.data.results.length} results)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {publishedPrices?.data.results.map((price) => (
                <div key={price.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{price.sku.name}</h3>
                      <Badge variant="outline">{price.sku.category}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {price.district.name} • {price.retailer.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {formatRelativeTime(price.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(price.price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      per {price.sku.unit}
                    </div>
                  </div>
                </div>
              ))}

              {publishedPrices?.data.results.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No prices found for your search criteria.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search filters.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SearchPageWrapper: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['farmer']}>
      <DashboardLayout>
        <SearchPage />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SearchPageWrapper;
