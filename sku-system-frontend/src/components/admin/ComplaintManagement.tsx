'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ExclamationTriangleIcon, 
  EyeIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  CameraIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { Complaint, User } from '@/types';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const ComplaintManagement: React.FC = () => {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);

  // Helper function to safely format percentage
  const formatPercentage = (value: any): string => {
    if (value === null || value === undefined) return '0.0';
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };
  const [resolutionData, setResolutionData] = useState({
    resolution_action: '',
    resolution_report: '',
    resolution_notes: ''
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['admin-complaints', statusFilter, priorityFilter],
    queryFn: () => apiClient.getComplaints({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    }),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/auth/users/'),
  });

  const { data: complaintStats } = useQuery({
    queryKey: ['complaint-statistics'],
    queryFn: () => apiClient.getComplaintStatistics(),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      apiClient.updateComplaintStatus(id, status, notes),
    onSuccess: () => {
      toast.success('Complaint status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint-statistics'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    },
  });

  // Resolve complaint mutation
  const resolveComplaintMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.resolveComplaint(id, data),
    onSuccess: () => {
      toast.success('Complaint resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint-statistics'] });
      setIsResolutionModalOpen(false);
      setResolutionData({ resolution_action: '', resolution_report: '', resolution_notes: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to resolve complaint');
    },
  });

  // Assign complaint mutation
  const assignComplaintMutation = useMutation({
    mutationFn: ({ complaintId, userId }: { complaintId: number; userId: number }) =>
      apiClient.assignComplaint(complaintId, userId),
    onSuccess: () => {
      toast.success('Complaint assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to assign complaint');
    },
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

  const handleUpdateStatus = (complaintId: number, status: string, notes?: string) => {
    updateStatusMutation.mutate({ id: complaintId, status, notes });
  };

  const handleResolveComplaint = () => {
    if (selectedComplaint) {
      resolveComplaintMutation.mutate({
        id: selectedComplaint.id,
        data: resolutionData
      });
    }
  };

  const handleAssignComplaint = (complaintId: number, userId: number) => {
    assignComplaintMutation.mutate({ complaintId, userId });
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedComplaint(null);
  };

  const handleCloseResolutionModal = () => {
    setIsResolutionModalOpen(false);
    setResolutionData({ resolution_action: '', resolution_report: '', resolution_notes: '' });
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
          <h2 className="text-2xl font-bold text-gray-900">Complaint Management</h2>
          <p className="text-gray-600">Manage and resolve customer complaints</p>
        </div>
        <Badge variant="secondary">
          {complaints?.data.results.length || 0} Total
        </Badge>
      </div>

      {/* Statistics */}
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
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="investigation">Investigation</option>
                <option value="waiting_response">Waiting Response</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      <div className="space-y-4">
        {complaints?.data.results.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Complaints Found</h3>
              <p className="text-gray-600">No complaints match the current filters.</p>
            </CardContent>
          </Card>
        ) : (
          complaints?.data.results.map((complaint: Complaint) => (
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Complainant</p>
                        <p className="font-medium">{complaint.complainant.get_full_name()}</p>
                      </div>
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
                        {complaint.has_evidence && (
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
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(complaint)}
                          leftIcon={<EyeIcon className="h-4 w-4" />}
                        >
                          View
                        </Button>
                        {complaint.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(complaint.id, 'under_review')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Start Review
                          </Button>
                        )}
                        {complaint.status === 'under_review' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setIsResolutionModalOpen(true);
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
              {selectedComplaint.evidence_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evidence Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedComplaint.evidence_files.map((evidence) => (
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
              {selectedComplaint.status_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedComplaint.status_history.map((history) => (
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

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={handleCloseModal}>
                Close
              </Button>
              {selectedComplaint.status === 'pending' && (
                <Button
                  onClick={() => handleUpdateStatus(selectedComplaint.id, 'under_review')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Start Review
                </Button>
              )}
              {selectedComplaint.status === 'under_review' && (
                <Button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsResolutionModalOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Resolve Complaint
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Resolution Modal */}
      <Modal isOpen={isResolutionModalOpen} onClose={handleCloseResolutionModal} size="md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Resolve Complaint</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Taken *
              </label>
              <textarea
                value={resolutionData.resolution_action}
                onChange={(e) => setResolutionData({ ...resolutionData, resolution_action: e.target.value })}
                placeholder="Describe the action taken to resolve the complaint..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Report *
              </label>
              <textarea
                value={resolutionData.resolution_report}
                onChange={(e) => setResolutionData({ ...resolutionData, resolution_report: e.target.value })}
                placeholder="Detailed report to be sent to the complainant..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={resolutionData.resolution_notes}
                onChange={(e) => setResolutionData({ ...resolutionData, resolution_notes: e.target.value })}
                placeholder="Internal notes (not visible to complainant)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="ghost" onClick={handleCloseResolutionModal}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveComplaint}
              disabled={!resolutionData.resolution_action || !resolutionData.resolution_report || resolveComplaintMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {resolveComplaintMutation.isPending ? 'Resolving...' : 'Resolve Complaint'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { ComplaintManagement };
