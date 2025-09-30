'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

const ComparisonPage: React.FC = () => {
  const [selectedPrices, setSelectedPrices] = useState<number[]>([]);

  const { data: publishedPrices, isLoading } = useQuery({
    queryKey: ['published-prices'],
    queryFn: () => apiClient.getPublishedPrices(),
  });

  const prices = publishedPrices?.data.results || [];
  const comparisonData = prices.filter(price => selectedPrices.includes(price.id));

  const handleTogglePrice = (priceId: number) => {
    setSelectedPrices(prev => 
      prev.includes(priceId) 
        ? prev.filter(id => id !== priceId)
        : [...prev, priceId]
    );
  };

  const getLowestPrice = () => {
    if (comparisonData.length === 0) return null;
    return comparisonData.reduce((lowest, current) => 
      current.price < lowest.price ? current : lowest
    );
  };

  const getHighestPrice = () => {
    if (comparisonData.length === 0) return null;
    return comparisonData.reduce((highest, current) => 
      current.price > highest.price ? current : highest
    );
  };

  const getAveragePrice = () => {
    if (comparisonData.length === 0) return 0;
    const total = comparisonData.reduce((sum, price) => sum + price.price, 0);
    return total / comparisonData.length;
  };

  const lowestPrice = getLowestPrice();
  const highestPrice = getHighestPrice();
  const averagePrice = getAveragePrice();

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
        <h1 className="text-2xl font-bold text-gray-900">Price Comparison</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare fertilizer prices across different retailers
        </p>
      </div>

      {/* Price Statistics */}
      {comparisonData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {lowestPrice ? formatCurrency(lowestPrice.price) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Lowest Price</div>
                {lowestPrice && (
                  <div className="text-xs text-gray-400 mt-1">
                    {lowestPrice.retailer.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {highestPrice ? formatCurrency(highestPrice.price) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Highest Price</div>
                {highestPrice && (
                  <div className="text-xs text-gray-400 mt-1">
                    {highestPrice.retailer.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(averagePrice)}
                </div>
                <div className="text-sm text-gray-500">Average Price</div>
                <div className="text-xs text-gray-400 mt-1">
                  {comparisonData.length} prices
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Available Prices</CardTitle>
          <p className="text-sm text-gray-500">
            Select prices to compare (up to 5 selections)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prices.map((price) => (
              <div
                key={price.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPrices.includes(price.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (selectedPrices.includes(price.id)) {
                    handleTogglePrice(price.id);
                  } else if (selectedPrices.length < 5) {
                    handleTogglePrice(price.id);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedPrices.includes(price.id)}
                    onChange={() => handleTogglePrice(price.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={!selectedPrices.includes(price.id) && selectedPrices.length >= 5}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{price.sku.name}</h3>
                    <p className="text-sm text-gray-500">
                      {price.district.name} • {price.retailer.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Updated {formatRelativeTime(price.created_at)}
                    </p>
                  </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retailer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      District
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comparisonData.map((price) => (
                    <tr key={price.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {price.sku.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {price.sku.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {price.retailer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {price.district.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(price.price)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatRelativeTime(price.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={price.compliant ? 'success' : 'danger'}>
                          {price.compliant ? 'Compliant' : 'Non-compliant'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ComparisonPageWrapper: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['farmer']}>
      <DashboardLayout>
        <ComparisonPage />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default ComparisonPageWrapper;
