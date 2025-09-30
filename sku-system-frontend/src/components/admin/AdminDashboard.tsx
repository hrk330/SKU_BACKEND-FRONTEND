'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UsersIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldExclamationIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ComplaintManagement } from './ComplaintManagement';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface DashboardData {
  alerts: {
    total_recent: number;
    unresolved: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    recent_alerts: Array<{
      id: number;
      title: string;
      severity: string;
      retailer_name: string;
      markup_percentage: number | null;
      created_at: string;
      is_resolved: boolean;
    }>;
  };
  compliance: {
    total_prices: number;
    compliant_prices: number;
    non_compliant_prices: number;
    compliance_rate: number;
    violation_breakdown: Record<string, number>;
  };
  top_violators: Array<{
    retailer_name: string;
    district: string;
    violation_count: number;
  }>;
  recent_activity: {
    price_changes_24h: number;
    recent_changes: Array<{
      retailer_name: string;
      product_name: string;
      price: number;
      markup_percentage: number | null;
      violation_severity: string;
      created_at: string;
    }>;
  };
  system_health: {
    products_without_ref_prices: number;
    district_compliance: Array<{
      district_name: string;
      total_prices: number;
      compliant_prices: number;
      compliance_rate: number;
    }>;
  };
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'complaints'>('overview');

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/pricing/admin/dashboard/').then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const { data: complaintStats } = useQuery({
    queryKey: ['complaint-statistics'],
    queryFn: () => apiClient.getComplaintStatistics(),
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            System overview and management
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">API Connection Error</h3>
              <p className="text-sm text-gray-500 mb-4">
                There was an error connecting to the backend API. Please check your connection.
              </p>
              <div className="text-xs text-gray-400">
                Error: {error.message}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            System overview and management
          </p>
        </div>
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

  if (!dashboardData) return null;

  const { alerts, compliance, top_violators, recent_activity, system_health } = dashboardData;

  const stats = [
    {
      name: 'Unresolved Alerts',
      value: alerts.unresolved,
      icon: BellIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      urgent: alerts.unresolved > 0,
    },
    {
      name: 'Compliance Rate',
      value: `${compliance.compliance_rate}%`,
      icon: ChartBarIcon,
      color: compliance.compliance_rate >= 80 ? 'text-green-600' : 
             compliance.compliance_rate >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: compliance.compliance_rate >= 80 ? 'bg-green-100' : 
               compliance.compliance_rate >= 60 ? 'bg-yellow-100' : 'bg-red-100',
    },
    {
      name: 'Price Changes (24h)',
      value: recent_activity.price_changes_24h,
      icon: CurrencyDollarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Products w/o Ref Prices',
      value: system_health.products_without_ref_prices,
      icon: ShieldExclamationIcon,
      color: system_health.products_without_ref_prices > 0 ? 'text-orange-600' : 'text-green-600',
      bgColor: system_health.products_without_ref_prices > 0 ? 'bg-orange-100' : 'bg-green-100',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getViolationSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'minor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time monitoring of price compliance, violations, and complaints
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
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
      {activeTab === 'overview' && (
        <>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className={stat.urgent ? 'ring-2 ring-red-500' : ''}>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Price Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BellIcon className="h-5 w-5 mr-2 text-red-600" />
              Price Violation Alerts
              {alerts.unresolved > 0 && (
                <Badge variant="danger" size="sm" className="ml-2">
                  {alerts.unresolved} Unresolved
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.recent_alerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent alerts</p>
                </div>
              ) : (
                alerts.recent_alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-500">
                        {alert.retailer_name} • {formatRelativeTime(alert.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.markup_percentage && (
                        <span className="text-sm font-medium text-gray-900">
                          +{alert.markup_percentage.toFixed(1)}%
                        </span>
                      )}
                      <Badge 
                        variant="secondary" 
                        size="sm"
                        className={getSeverityColor(alert.severity)}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
              Compliance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Compliance</span>
                <span className="text-sm font-medium text-gray-900">
                  {compliance.compliance_rate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    compliance.compliance_rate >= 80 ? 'bg-green-600' : 
                    compliance.compliance_rate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${compliance.compliance_rate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>100%</span>
              </div>
              
              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">Compliant Prices</span>
                  <span className="font-medium">{compliance.compliant_prices}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600">Non-Compliant Prices</span>
                  <span className="font-medium">{compliance.non_compliant_prices}</span>
                </div>
              </div>

              {/* Violation Breakdown */}
              {Object.keys(compliance.violation_breakdown).length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Violation Breakdown</h4>
                  <div className="space-y-1">
                    {Object.entries(compliance.violation_breakdown).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between text-xs">
                        <Badge 
                          variant="secondary" 
                          size="sm"
                          className={getViolationSeverityColor(severity)}
                        >
                          {severity}
                        </Badge>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Violators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-600" />
              Top Violating Retailers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {top_violators.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No major violations</p>
                </div>
              ) : (
                top_violators.map((violator, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{violator.retailer_name}</p>
                      <p className="text-xs text-gray-500">{violator.district}</p>
                    </div>
                    <Badge variant="danger" size="sm">
                      {violator.violation_count} violations
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Price Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
              Recent Price Changes (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_activity.recent_changes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No recent price changes</p>
                </div>
              ) : (
                recent_activity.recent_changes.map((change, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{change.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {change.retailer_name} • {formatRelativeTime(change.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(change.price)}
                      </span>
                      {change.markup_percentage && (
                        <span className="text-xs text-gray-500">
                          +{change.markup_percentage.toFixed(1)}%
                        </span>
                      )}
                      {change.violation_severity !== 'none' && (
                        <Badge 
                          variant="secondary" 
                          size="sm"
                          className={getViolationSeverityColor(change.violation_severity)}
                        >
                          {change.violation_severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 mr-2 text-purple-600" />
            District-wise Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {system_health.district_compliance.map((district) => (
              <div key={district.district_name} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{district.district_name}</h4>
                  <span className="text-sm font-medium text-gray-900">
                    {district.compliance_rate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      district.compliance_rate >= 80 ? 'bg-green-600' : 
                      district.compliance_rate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${district.compliance_rate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{district.compliant_prices}/{district.total_prices} compliant</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      )}

      {activeTab === 'complaints' && (
        <ComplaintManagement />
      )}
    </div>
  );
};

export { AdminDashboard };