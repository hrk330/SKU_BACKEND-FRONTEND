import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  District, 
  SKU, 
  Retailer, 
  ReferencePrice, 
  PublishedPrice, 
  PriceAudit, 
  FarmerPriceQuery, 
  ApiResponse, 
  PriceFormData, 
  SearchFormData,
  DashboardStats,
  Notification,
  PriceAlert,
  Favorite,
  Complaint,
  ComplaintCreateData,
  PriceViolationComplaintData,
  ComplaintEvidence,
  ComplaintStatistics
} from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              this.setTokens(response.data.tokens);
              originalRequest.headers.Authorization = `Bearer ${response.data.tokens.access}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private setTokens(tokens: { access: string; refresh: string }): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Authentication API
  async login(credentials: LoginRequest): Promise<AxiosResponse<AuthResponse>> {
    return this.client.post('/auth/login/', credentials);
  }

  async register(userData: RegisterRequest): Promise<AxiosResponse<AuthResponse>> {
    return this.client.post('/auth/register/', userData);
  }

  async refreshToken(refreshToken: string): Promise<AxiosResponse<AuthResponse>> {
    return this.client.post('/token/refresh/', { refresh: refreshToken });
  }

  async getProfile(): Promise<AxiosResponse<User>> {
    return this.client.get('/auth/profile/');
  }

  async updateProfile(userData: Partial<User>): Promise<AxiosResponse<User>> {
    return this.client.patch('/auth/profile/', userData);
  }

  // Districts API
  async getDistricts(): Promise<AxiosResponse<ApiResponse<District>>> {
    return this.client.get('/districts/');
  }

  async getDistrict(id: number): Promise<AxiosResponse<District>> {
    return this.client.get(`/districts/${id}/`);
  }

  // SKU/Catalog API
  async getSKUs(): Promise<AxiosResponse<ApiResponse<SKU>>> {
    return this.client.get('/catalog/');
  }

  async getSKU(id: number): Promise<AxiosResponse<SKU>> {
    return this.client.get(`/catalog/${id}/`);
  }

  // Retailers API
  async getRetailers(): Promise<AxiosResponse<ApiResponse<Retailer>>> {
    return this.client.get('/retailers/');
  }

  async getRetailer(id: number): Promise<AxiosResponse<Retailer>> {
    return this.client.get(`/retailers/${id}/`);
  }

  async createRetailerProfile(retailerData: Partial<Retailer>): Promise<AxiosResponse<Retailer>> {
    return this.client.post('/retailers/', retailerData);
  }

  async updateRetailerProfile(id: number, retailerData: Partial<Retailer>): Promise<AxiosResponse<Retailer>> {
    return this.client.patch(`/retailers/${id}/`, retailerData);
  }

  // Reference Prices API
  async getReferencePrices(): Promise<AxiosResponse<ApiResponse<ReferencePrice>>> {
    return this.client.get('/pricing/reference-prices/');
  }

  async getReferencePrice(id: number): Promise<AxiosResponse<ReferencePrice>> {
    return this.client.get(`/pricing/reference-prices/${id}/`);
  }

  async createReferencePrice(priceData: Partial<ReferencePrice>): Promise<AxiosResponse<ReferencePrice>> {
    return this.client.post('/pricing/reference-prices/', priceData);
  }

  async updateReferencePrice(id: number, priceData: Partial<ReferencePrice>): Promise<AxiosResponse<ReferencePrice>> {
    return this.client.patch(`/pricing/reference-prices/${id}/`, priceData);
  }

  async deleteReferencePrice(id: number): Promise<AxiosResponse<void>> {
    return this.client.delete(`/pricing/reference-prices/${id}/`);
  }

  // Published Prices API
  async getPublishedPrices(): Promise<AxiosResponse<ApiResponse<PublishedPrice>>> {
    return this.client.get('/pricing/published-prices/');
  }

  async getPublishedPrice(id: number): Promise<AxiosResponse<PublishedPrice>> {
    return this.client.get(`/pricing/published-prices/${id}/`);
  }

  async createPublishedPrice(priceData: PriceFormData): Promise<AxiosResponse<PublishedPrice>> {
    return this.client.post('/pricing/published-prices/', priceData);
  }

  async updatePublishedPrice(id: number, priceData: Partial<PriceFormData>): Promise<AxiosResponse<PublishedPrice>> {
    return this.client.patch(`/pricing/published-prices/${id}/`, priceData);
  }

  async deletePublishedPrice(id: number): Promise<AxiosResponse<void>> {
    return this.client.delete(`/pricing/published-prices/${id}/`);
  }

  // Price Audit API
  async getPriceAudits(): Promise<AxiosResponse<ApiResponse<PriceAudit>>> {
    return this.client.get('/pricing/price-audits/');
  }

  async getPriceAudit(id: number): Promise<AxiosResponse<PriceAudit>> {
    return this.client.get(`/pricing/price-audits/${id}/`);
  }

  // Farmer Price Query API
  async getFarmerPrices(params: SearchFormData): Promise<AxiosResponse<FarmerPriceQuery>> {
    return this.client.get('/farmer/prices/', { params });
  }

  // Dashboard Stats API
  async getDashboardStats(): Promise<AxiosResponse<DashboardStats>> {
    return this.client.get('/dashboard/stats/');
  }

  // Notifications API
  async getNotifications(): Promise<AxiosResponse<ApiResponse<Notification>>> {
    return this.client.get('/notifications/');
  }

  async markNotificationAsRead(id: number): Promise<AxiosResponse<Notification>> {
    return this.client.patch(`/notifications/${id}/read/`);
  }

  // Price Alerts API
  async getPriceAlerts(): Promise<AxiosResponse<ApiResponse<PriceAlert>>> {
    return this.client.get('/alerts/');
  }

  async createPriceAlert(alertData: Partial<PriceAlert>): Promise<AxiosResponse<PriceAlert>> {
    return this.client.post('/alerts/', alertData);
  }

  async updatePriceAlert(id: number, alertData: Partial<PriceAlert>): Promise<AxiosResponse<PriceAlert>> {
    return this.client.patch(`/alerts/${id}/`, alertData);
  }

  async deletePriceAlert(id: number): Promise<AxiosResponse<void>> {
    return this.client.delete(`/alerts/${id}/`);
  }

  // Favorites API
  async getFavorites(): Promise<AxiosResponse<ApiResponse<Favorite>>> {
    return this.client.get('/favorites/');
  }

  async addFavorite(skuId: number, districtId: number): Promise<AxiosResponse<Favorite>> {
    return this.client.post('/favorites/', { sku_id: skuId, district_id: districtId });
  }

  async removeFavorite(id: number): Promise<AxiosResponse<void>> {
    return this.client.delete(`/favorites/${id}/`);
  }

  // Complaints API
  async getComplaints(params?: any): Promise<AxiosResponse<ApiResponse<Complaint>>> {
    return this.client.get('/complaints/', { params });
  }

  async getComplaint(id: number): Promise<AxiosResponse<Complaint>> {
    return this.client.get(`/complaints/${id}/`);
  }

  async createComplaint(complaintData: ComplaintCreateData): Promise<AxiosResponse<Complaint>> {
    return this.client.post('/complaints/', complaintData);
  }

  async createPriceViolationComplaint(complaintData: PriceViolationComplaintData): Promise<AxiosResponse<Complaint>> {
    return this.client.post('/complaints/price-violation/', complaintData);
  }

  async updateComplaintStatus(id: number, status: string, notes?: string): Promise<AxiosResponse<Complaint>> {
    return this.client.patch(`/complaints/${id}/status/`, { status, notes });
  }

  async resolveComplaint(id: number, resolutionData: {
    resolution_action: string;
    resolution_report: string;
    resolution_notes: string;
  }): Promise<AxiosResponse<Complaint>> {
    return this.client.patch(`/complaints/${id}/resolve/`, resolutionData);
  }

  async uploadComplaintEvidence(complaintId: number, file: File, fileType: string, description?: string): Promise<AxiosResponse<ComplaintEvidence>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    if (description) {
      formData.append('description', description);
    }

    return this.client.post(`/complaints/${complaintId}/evidence/`, formData);
  }

  async getMyComplaints(params?: any): Promise<AxiosResponse<ApiResponse<Complaint>>> {
    return this.client.get('/complaints/my-complaints/', { params });
  }

  async getComplaintStatistics(): Promise<AxiosResponse<ComplaintStatistics>> {
    return this.client.get('/complaints/statistics/');
  }

  async assignComplaint(complaintId: number, assignedToId: number): Promise<AxiosResponse<any>> {
    return this.client.post(`/complaints/${complaintId}/assign/`, { assigned_to: assignedToId });
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.client.get(url, config);
  }

  async post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.client.post(url, data);
  }

  async put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.client.put(url, data);
  }

  async patch<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data);
  }

  async delete<T = any>(url: string): Promise<AxiosResponse<T>> {
    return this.client.delete(url);
  }

  // Utility methods
  logout(): void {
    this.clearTokens();
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
