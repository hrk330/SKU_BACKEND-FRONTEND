'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ExclamationTriangleIcon, 
  CameraIcon, 
  DocumentIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api';
import { PriceViolationComplaintData, SKU, District, Retailer } from '@/types';
import { toast } from 'react-hot-toast';

interface ComplaintRegistrationProps {
  onSuccess?: () => void;
}

const ComplaintRegistration: React.FC<ComplaintRegistrationProps> = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<PriceViolationComplaintData>({
    title: '',
    description: '',
    district: 0,
    sku: 0,
    reported_retailer: 0,
    reported_price: 0,
    incident_location: '',
    incident_date: '',
    witness_details: '',
    contact_number: '',
    priority: 'medium'
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data for dropdowns
  const { data: skus } = useQuery({
    queryKey: ['skus'],
    queryFn: () => apiClient.getSKUs(),
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: () => apiClient.getDistricts(),
  });

  const { data: retailers } = useQuery({
    queryKey: ['retailers'],
    queryFn: () => apiClient.getRetailers(),
  });

  // Create complaint mutation
  const createComplaintMutation = useMutation({
    mutationFn: (data: PriceViolationComplaintData) => 
      apiClient.createPriceViolationComplaint(data),
    onSuccess: async (response) => {
      // Upload evidence files if any
      if (evidenceFiles.length > 0 && response?.data?.id) {
        let uploadSuccess = true;
        for (const file of evidenceFiles) {
          try {
            await apiClient.uploadComplaintEvidence(
              response.data.id,
              file,
              file.type.startsWith('image/') ? 'image' : 'document',
              `Evidence for complaint: ${formData.title}`
            );
          } catch (error) {
            console.error('Failed to upload evidence:', error);
            console.error('Response data:', response?.data);
            uploadSuccess = false;
          }
        }
        
        if (uploadSuccess) {
          toast.success('Complaint and evidence submitted successfully!');
        } else {
          toast.success('Complaint submitted successfully, but some evidence files failed to upload');
        }
      } else {
        toast.success('Complaint submitted successfully!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit complaint');
    },
  });

  const handleInputChange = (field: keyof PriceViolationComplaintData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEvidenceFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.district || 
          !formData.sku || !formData.reported_retailer || !formData.reported_price) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Submit complaint (evidence upload is handled in the mutation's onSuccess)
      await createComplaintMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      title: '',
      description: '',
      district: 0,
      sku: 0,
      reported_retailer: 0,
      reported_price: 0,
      incident_location: '',
      incident_date: '',
      witness_details: '',
      contact_number: '',
      priority: 'medium'
    });
    setEvidenceFiles([]);
  };

  const selectedSKU = skus?.data.results.find(sku => sku.id === formData.sku);
  const selectedRetailer = retailers?.data.results.find(retailer => retailer.id === formData.reported_retailer);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white"
        leftIcon={<ExclamationTriangleIcon className="h-5 w-5" />}
      >
        File Price Violation Complaint
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">File Price Violation Complaint</h2>
              <p className="text-gray-600">Report retailers selling above government rates</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Complaint Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complaint Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Provide detailed information about the price violation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <Input
                      value={formData.contact_number}
                      onChange={(e) => handleInputChange('contact_number', e.target.value)}
                      placeholder="Your contact number"
                      type="tel"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product and Retailer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Product & Retailer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product (SKU) *
                    </label>
                    <select
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select a product</option>
                      {skus?.data.results.map((sku: SKU) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Retailer *
                    </label>
                    <select
                      value={formData.reported_retailer}
                      onChange={(e) => handleInputChange('reported_retailer', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select a retailer</option>
                      {retailers?.data.results.map((retailer: Retailer) => (
                        <option key={retailer.id} value={retailer.id}>
                          {retailer.business_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <select
                      value={formData.district}
                      onChange={(e) => handleInputChange('district', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select a district</option>
                      {districts?.data.results.map((district: District) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Charged (₹) *
                    </label>
                    <Input
                      value={formData.reported_price}
                      onChange={(e) => handleInputChange('reported_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                {selectedSKU && selectedRetailer && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-2">Complaint Summary</h4>
                    <p className="text-sm text-blue-700">
                      <strong>Product:</strong> {selectedSKU.name}<br />
                      <strong>Retailer:</strong> {selectedRetailer.business_name}<br />
                      <strong>Price Charged:</strong> ₹{formData.reported_price}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Incident Details */}
            <Card>
              <CardHeader>
                <CardTitle>Incident Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPinIcon className="h-4 w-4 inline mr-1" />
                    Incident Location *
                  </label>
                  <Input
                    value={formData.incident_location}
                    onChange={(e) => handleInputChange('incident_location', e.target.value)}
                    placeholder="Specific location where the incident occurred"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Incident Date & Time
                  </label>
                  <Input
                    value={formData.incident_date}
                    onChange={(e) => handleInputChange('incident_date', e.target.value)}
                    type="datetime-local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Witness Details
                  </label>
                  <textarea
                    value={formData.witness_details}
                    onChange={(e) => handleInputChange('witness_details', e.target.value)}
                    placeholder="Details of any witnesses (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Evidence Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Evidence Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CameraIcon className="h-4 w-4 inline mr-1" />
                    Upload Evidence (Photos, Receipts, Documents)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload photos of the product, receipt, or any relevant documents
                  </p>
                </div>

                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Selected Files:</h4>
                    {evidenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center">
                          <DocumentIcon className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <Badge variant="secondary" size="sm" className="ml-2">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export { ComplaintRegistration };
