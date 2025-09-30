// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'gov_admin' | 'retailer' | 'farmer';
  is_verified: boolean;
  date_joined: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'retailer' | 'farmer';
  password: string;
  password_confirm: string;
}

// District Types
export interface District {
  id: number;
  name: string;
  parent?: number;
  level: number;
  full_path: string;
  children_count: number;
}

// SKU Types
export interface SKU {
  id: number;
  name: string;
  category: string;
  unit: string;
  description: string;
  display_name: string;
}

// Retailer Types
export interface Retailer {
  id: number;
  user: User;
  business_name: string;
  license_no: string;
  contact_person: string;
  district: District;
  address: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Pricing Types
export interface ReferencePrice {
  id: number;
  sku: SKU;
  district?: District;
  price: number;
  scope: string;
  is_global: boolean;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  created_by: User;
  created_at: string;
  updated_at: string;
}

export interface PublishedPrice {
  id: number;
  retailer: Retailer;
  sku: SKU;
  district: District;
  price: number;
  compliant: boolean;
  markup_percentage: number;
  reference_price: number;
  created_at: string;
  updated_at: string;
}

export interface PriceAudit {
  id: number;
  published_price: PublishedPrice;
  validation_result: {
    valid: boolean;
    allowed_max: number;
    reason?: string;
  };
  created_at: string;
}

// Farmer Price Query Types
export interface FarmerPriceQuery {
  sku: SKU;
  reference_price: ReferencePrice;
  retailer_prices: PublishedPrice[];
  cached_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ApiError {
  detail: string;
  [key: string]: any;
}

// Form Types
export interface PriceFormData {
  sku_id: number;
  district_id?: number;
  price: number;
  effective_from?: string;
  effective_until?: string;
}

export interface SearchFormData {
  sku_id?: number;
  district_id?: number;
  min_price?: number;
  max_price?: number;
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// Dashboard Stats Types
export interface DashboardStats {
  total_prices: number;
  compliant_prices: number;
  non_compliant_prices: number;
  compliance_rate: number;
  total_products: number;
  active_retailers: number;
}

// Notification Types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

// Alert Types
export interface PriceAlert {
  id: number;
  sku: SKU;
  district: District;
  target_price: number;
  alert_type: 'below' | 'above';
  is_active: boolean;
  created_at: string;
}

// Favorite Types
export interface Favorite {
  id: number;
  sku: SKU;
  district: District;
  created_at: string;
}

// Complaint Types
export interface Complaint {
  id: number;
  complaint_type: 'price_violation' | 'service_issue' | 'product_quality' | 'other';
  title: string;
  description: string;
  complainant: User;
  district: District;
  sku?: SKU;
  reported_retailer?: Retailer;
  reported_price?: number;
  reference_price?: number;
  price_difference?: number;
  price_difference_percentage?: number;
  incident_location: string;
  incident_date?: string;
  witness_details: string;
  contact_number: string;
  status: 'pending' | 'under_review' | 'investigation' | 'waiting_response' | 'resolved' | 'rejected' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: User;
  investigation_notes: string;
  resolution_action: string;
  resolution_report: string;
  resolution_notes: string;
  evidence_files: ComplaintEvidence[];
  status_history: ComplaintStatusHistory[];
  notifications: ComplaintNotification[];
  is_resolved: boolean;
  is_pending: boolean;
  is_price_violation: boolean;
  has_evidence: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface ComplaintEvidence {
  id: number;
  file: string;
  file_type: 'image' | 'document' | 'receipt' | 'invoice' | 'other';
  description: string;
  uploaded_by_name: string;
  uploaded_at: string;
  file_url?: string;
}

export interface ComplaintStatusHistory {
  id: number;
  old_status?: string;
  new_status: string;
  changed_by_name: string;
  notes: string;
  timestamp: string;
}

export interface ComplaintNotification {
  id: number;
  notification_type: 'status_change' | 'assignment' | 'resolution' | 'evidence_request' | 'follow_up';
  title: string;
  message: string;
  sent_via_email: boolean;
  sent_via_sms: boolean;
  sent_at: string;
  read_at?: string;
}

export interface ComplaintCreateData {
  complaint_type: 'price_violation' | 'service_issue' | 'product_quality' | 'other';
  title: string;
  description: string;
  district: number;
  sku?: number;
  reported_retailer?: number;
  reported_price?: number;
  incident_location: string;
  incident_date?: string;
  witness_details: string;
  contact_number: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface PriceViolationComplaintData {
  title: string;
  description: string;
  district: number;
  sku: number;
  reported_retailer: number;
  reported_price: number;
  incident_location: string;
  incident_date?: string;
  witness_details: string;
  contact_number: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ComplaintStatistics {
  total_complaints: number;
  pending_complaints: number;
  under_review: number;
  resolved_complaints: number;
  price_violations: number;
}