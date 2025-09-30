'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ExclamationTriangleIcon, 
  EyeIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api';
import { Complaint } from '@/types';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

const MyComplaints: React.FC = () => {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Helper function to safely format percentage
  const formatPercentage = (value: any): string => {
    if (value === null || value === undefined) return '0.0';
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => apiClient.getMyComplaints(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'investigation':
        return 'bg-purple-100 text-purple-800';
      case 'waiting_response':
        return 'bg-orange-100 text-orange-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'under_review':
        return <EyeIcon className="h-4 w-4" />;
      case 'investigation':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'waiting_response':
        return <ClockIcon className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'rejected':
        return <XCircleIcon className="h-4 w-4" />;
      case 'closed':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedComplaint(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Complaints</h2>
          <p className="text-gray-600">Track the status of your submitted complaints</p>
        </div>
        <Badge variant="secondary">
          {complaints?.data.results.length || 0} Total
        </Badge>
      </div>

      {complaints?.data.results.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Complaints Yet</h3>
            <p className="text-gray-600">You haven't submitted any complaints yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints?.data.results.map((complaint: Complaint) => (
            <Card key={complaint.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {complaint.title}
                      </h3>
                      <Badge className={getStatusColor(complaint.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(complaint.status)}
                          <span className="capitalize">{complaint.status.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                      <Badge className={getPriorityColor(complaint.priority)}>
                        {complaint.priority}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Product</p>
                        <p className="font-medium">{complaint.sku?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Retailer</p>
                        <p className="font-medium">{complaint.reported_retailer?.business_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Price Charged</p>
                        <p className="font-medium">
                          {complaint.reported_price ? formatCurrency(complaint.reported_price) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {complaint.is_price_violation && (
                      <div className="bg-red-50 p-3 rounded-md mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-red-900">Price Violation Detected</p>
                            <p className="text-sm text-red-700">
                              Reference Price: {complaint.reference_price ? formatCurrency(complaint.reference_price) : 'N/A'}
                              {complaint.price_difference && (
                                <span className="ml-2">
                                  (Difference: {Number(complaint.price_difference) > 0 ? '+' : ''}{formatCurrency(complaint.price_difference)})
                                </span>
                              )}
                            </p>
                          </div>
                          {complaint.price_difference_percentage && (
                            <Badge variant="danger">
                              {Number(complaint.price_difference_percentage) > 0 ? '+' : ''}{formatPercentage(complaint.price_difference_percentage)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Submitted {formatRelativeTime(complaint.created_at)}</span>
                        {complaint.has_evidence && complaint.evidence_files && (
                          <div className="flex items-center space-x-1">
                            <CameraIcon className="h-4 w-4" />
                            <span>{complaint.evidence_files.length} evidence files</span>
                          </div>
                        )}
                        {complaint.assigned_to && (
                          <div className="flex items-center space-x-1">
                            <span>Assigned to: {complaint.assigned_to.first_name} {complaint.assigned_to.last_name}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(complaint)}
                        leftIcon={<EyeIcon className="h-4 w-4" />}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Complaint Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={handleCloseModal} size="lg">
        {selectedComplaint && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedComplaint.title}</h2>
                <p className="text-gray-600">Complaint #{selectedComplaint.id}</p>
              </div>
              <div className="flex space-x-2">
                <Badge className={getStatusColor(selectedComplaint.status)}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(selectedComplaint.status)}
                    <span className="capitalize">{selectedComplaint.status.replace('_', ' ')}</span>
                  </div>
                </Badge>
                <Badge className={getPriorityColor(selectedComplaint.priority)}>
                  {selectedComplaint.priority}
                </Badge>
              </div>
            </div>

            <div className="space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedComplaint.description}</p>
                </CardContent>
              </Card>

              {/* Product & Price Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Product & Price Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Product</p>
                      <p className="font-medium">{selectedComplaint.sku?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Retailer</p>
                      <p className="font-medium">{selectedComplaint.reported_retailer?.business_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price Charged</p>
                      <p className="font-medium">
                        {selectedComplaint.reported_price ? formatCurrency(selectedComplaint.reported_price) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reference Price</p>
                      <p className="font-medium">
                        {selectedComplaint.reference_price ? formatCurrency(selectedComplaint.reference_price) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {selectedComplaint.is_price_violation && (
                    <div className="mt-4 bg-red-50 p-4 rounded-md">
                      <h4 className="font-medium text-red-900 mb-2">Price Violation Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-red-700">Price Difference</p>
                          <p className="font-medium text-red-900">
                            {selectedComplaint.price_difference ? formatCurrency(selectedComplaint.price_difference) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-red-700">Percentage Difference</p>
                          <p className="font-medium text-red-900">
                            {selectedComplaint.price_difference_percentage ? 
                              `${Number(selectedComplaint.price_difference_percentage) > 0 ? '+' : ''}${formatPercentage(selectedComplaint.price_difference_percentage)}%` : 
                              'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Incident Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Incident Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{selectedComplaint.incident_location}</p>
                    </div>
                    {selectedComplaint.incident_date && (
                      <div>
                        <p className="text-sm text-gray-600">Date & Time</p>
                        <p className="font-medium">{new Date(selectedComplaint.incident_date).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedComplaint.witness_details && (
                      <div>
                        <p className="text-sm text-gray-600">Witness Details</p>
                        <p className="font-medium">{selectedComplaint.witness_details}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Evidence Files */}
              {selectedComplaint.evidence_files && selectedComplaint.evidence_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evidence Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedComplaint.evidence_files?.map((evidence) => (
                        <div key={evidence.id} className="border rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-8 w-8 text-gray-500" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{evidence.file_type}</p>
                              <p className="text-sm text-gray-600">{evidence.description}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded {formatRelativeTime(evidence.uploaded_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {selectedComplaint.status_history && selectedComplaint.status_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedComplaint.status_history?.map((history) => (
                        <div key={history.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {history.old_status ? 
                                `${history.old_status.replace('_', ' ')} → ${history.new_status.replace('_', ' ')}` : 
                                history.new_status.replace('_', ' ')
                              }
                            </p>
                            <p className="text-sm text-gray-600">
                              by {history.changed_by_name} • {formatRelativeTime(history.timestamp)}
                            </p>
                            {history.notes && (
                              <p className="text-sm text-gray-700 mt-1">{history.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resolution Details */}
              {selectedComplaint.is_resolved && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resolution Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedComplaint.resolution_action && (
                        <div>
                          <p className="text-sm text-gray-600">Action Taken</p>
                          <p className="font-medium">{selectedComplaint.resolution_action}</p>
                        </div>
                      )}
                      {selectedComplaint.resolution_report && (
                        <div>
                          <p className="text-sm text-gray-600">Resolution Report</p>
                          <p className="font-medium">{selectedComplaint.resolution_report}</p>
                        </div>
                      )}
                      {selectedComplaint.resolved_at && (
                        <div>
                          <p className="text-sm text-gray-600">Resolved On</p>
                          <p className="font-medium">{new Date(selectedComplaint.resolved_at).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="ghost" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export { MyComplaints };
