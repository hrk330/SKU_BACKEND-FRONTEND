'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { PriceFormData, PublishedPrice, SKU, District } from '@/types';

const PriceManagement: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PublishedPrice | null>(null);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const { data: publishedPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['published-prices'],
    queryFn: () => apiClient.getPublishedPrices(),
  });

  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ['skus'],
    queryFn: () => apiClient.getSKUs(),
  });

  const { data: districts, isLoading: districtsLoading } = useQuery({
    queryKey: ['districts'],
    queryFn: () => apiClient.getDistricts(),
  });

  const { data: referencePrices } = useQuery({
    queryKey: ['reference-prices'],
    queryFn: () => apiClient.getReferencePrices(),
  });

  const createPriceMutation = useMutation({
    mutationFn: (data: PriceFormData) => {
      console.log('DEBUG: Frontend sending data:', data);
      return apiClient.createPublishedPrice(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['published-prices'] });
      setIsCreateModalOpen(false);
      setError('');
    },
    onError: (error) => {
      console.error('DEBUG: Frontend error:', error);
      
      // Handle specific error cases
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle overlapping price period error
        if (Array.isArray(errorData) && errorData.includes("Published price period overlaps with existing active price.")) {
          setError("You already have an active price for this product. Please edit the existing price or wait for it to expire.");
          
          // Find and auto-populate the existing price for editing
          const currentData = createPriceMutation.variables;
          if (currentData && publishedPrices?.data.results) {
            const existingPrice = publishedPrices.data.results.find(
              (price: PublishedPrice) => price.sku.id === currentData.sku_id
            );
            if (existingPrice) {
              // Auto-populate the form with existing price data
              setTimeout(() => {
                handleEdit(existingPrice);
              }, 1000);
            }
          }
        } else if (typeof errorData === 'object') {
          // Handle field-specific errors
          const fieldErrors = Object.values(errorData).flat();
          setError(fieldErrors.join(', '));
        } else {
          setError(getErrorMessage(error));
        }
      } else {
        setError(getErrorMessage(error));
      }
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PriceFormData> }) =>
      apiClient.updatePublishedPrice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['published-prices'] });
      setEditingPrice(null);
      setError('');
    },
    onError: (error) => {
      setError(getErrorMessage(error));
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: (id: number) => apiClient.deletePublishedPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['published-prices'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PriceFormData>();

  const watchedSkuId = watch('sku_id');
  const watchedDistrictId = watch('district_id');

  const onSubmit = (data: PriceFormData) => {
    console.log('DEBUG: Form submitted with data:', data);
    
    // Convert string values to proper types
    const processedData = {
      ...data,
      sku_id: parseInt(data.sku_id.toString()),
      price: parseFloat(data.price.toString()),
      district_id: data.district_id ? parseInt(data.district_id.toString()) : undefined,
    };
    
    console.log('DEBUG: Processed data:', processedData);
    
    if (editingPrice) {
      updatePriceMutation.mutate({ id: editingPrice.id, data: processedData });
    } else {
      createPriceMutation.mutate(processedData);
    }
  };

  const handleEdit = (price: PublishedPrice) => {
    setEditingPrice(price);
    reset({
      sku_id: price.sku.id,
      district_id: price.district.id,
      price: price.price,
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this price?')) {
      deletePriceMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingPrice(null);
    setError('');
    reset();
  };

  const getReferencePrice = (skuId: number, districtId?: number) => {
    if (!referencePrices?.data.results) {
      console.log('DEBUG: No reference prices data available');
      return null;
    }
    
    console.log(`DEBUG: Looking for reference price for SKU ${skuId}, District ${districtId}`);
    console.log(`DEBUG: Available reference prices:`, referencePrices.data.results.map(r => ({
      sku: r.sku.name,
      skuId: r.sku.id,
      district: r.district?.name || 'Global',
      districtId: r.district?.id || null,
      price: r.price
    })));
    
    // First try to find district-specific reference price
    if (districtId) {
      const districtSpecific = referencePrices.data.results.find(
        (ref) => ref.sku.id === skuId && ref.district?.id === districtId
      );
      if (districtSpecific) {
        console.log(`DEBUG: Found district-specific reference price:`, districtSpecific);
        return districtSpecific;
      }
    }
    
    // Fall back to global reference price
    const global = referencePrices.data.results.find(
      (ref) => ref.sku.id === skuId && ref.district === null
    );
    
    if (global) {
      console.log(`DEBUG: Found global reference price:`, global);
    } else {
      console.log(`DEBUG: No reference price found for SKU ${skuId}`);
    }
    
    return global;
  };

  const columns = [
    {
      key: 'sku',
      title: 'Product',
      render: (value: any, item: PublishedPrice) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{item.sku.name}</p>
          <p className="text-xs text-gray-500">{item.sku.category}</p>
        </div>
      ),
    },
    {
      key: 'district',
      title: 'District',
      render: (value: any, item: PublishedPrice) => item.district.name,
    },
    {
      key: 'price',
      title: 'Your Price',
      render: (value: any, item: PublishedPrice) => (
        <span className="font-medium">{formatCurrency(item.price)}</span>
      ),
    },
    {
      key: 'reference_price',
      title: 'Reference Price',
      render: (value: any, item: PublishedPrice) => {
        const refPrice = getReferencePrice(item.sku.id, item.district?.id);
        return refPrice ? formatCurrency(refPrice.price) : 'N/A';
      },
    },
    {
      key: 'markup_percentage',
      title: 'Markup',
      render: (value: any, item: PublishedPrice) => (
        <span className={item.markup_percentage > 10 ? 'text-red-600' : 'text-green-600'}>
          {item.markup_percentage.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'compliant',
      title: 'Status',
      render: (value: any, item: PublishedPrice) => (
        <Badge variant={item.compliant ? 'success' : 'danger'}>
          {item.compliant ? 'Compliant' : 'Non-compliant'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: 'Updated',
      render: (value: any, item: PublishedPrice) => formatRelativeTime(item.created_at),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, item: PublishedPrice) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-800"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="text-red-600 hover:text-red-800"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (pricesLoading || skusLoading || districtsLoading) {
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your published prices and monitor compliance
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Publish New Price
        </Button>
      </div>

      {/* Price Table */}
      <DataTable
        data={publishedPrices?.data.results || []}
        columns={columns}
        loading={pricesLoading}
        emptyMessage="No prices published yet"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        title={editingPrice ? 'Edit Price' : 'Publish New Price'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              {...register('sku_id', { required: 'Please select a product' })}
            >
              <option value="">Select a product</option>
              {skus?.data.results.map((sku: SKU) => {
                const hasActivePrice = publishedPrices?.data.results.some(
                  (price: PublishedPrice) => price.sku.id === sku.id
                );
                return (
                  <option key={sku.id} value={sku.id}>
                    {sku.name} ({sku.category}) {hasActivePrice ? '⚠️ Has active price' : ''}
                  </option>
                );
              })}
            </select>
            {errors.sku_id && (
              <p className="mt-1 text-sm text-red-600">{errors.sku_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District (Optional)
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              {...register('district_id')}
            >
              <option value="">Use retailer's district (recommended)</option>
              {districts?.data.results.map((district: District) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to use your retailer's default district
            </p>
          </div>

          {watchedSkuId && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                Reference Price: {(() => {
                  // Use the selected district or retailer's default district
                  const districtId = watchedDistrictId || undefined; // Use undefined for global fallback
                  const refPrice = getReferencePrice(watchedSkuId, districtId);
                  return refPrice ? formatCurrency(refPrice.price) : 'Not available';
                })()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {watchedDistrictId ? 'District-specific price' : 'Global reference price will be used'}
              </p>
            </div>
          )}

          <Input
            label="Your Price (₹)"
            type="number"
            step="0.01"
            placeholder="Enter your price"
            error={errors.price?.message}
            {...register('price', {
              required: 'Price is required',
              min: { value: 0.01, message: 'Price must be greater than 0' },
            })}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createPriceMutation.isPending || updatePriceMutation.isPending}
            >
              {editingPrice ? 'Update Price' : 'Publish Price'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export { PriceManagement };
