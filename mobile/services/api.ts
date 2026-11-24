// mobile/services/api.ts
// Central API client connecting React Native to the Express backend

import type {
  Product,
  ProductCategory,
  ProductCondition,
  CreateProductPayload,
  UpdateProductPayload,
  UserProfile,
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  Message,
  Conversation,
  SendMessagePayload,
  AppNotification,
  CampusMeetupLocation,
  CommunityReport,
  CreateReportPayload,
  PaymentTransaction,
  InitiatePaymentPayload,
  VerifyPaymentPayload,
  ReturnRequest,
  CreateReturnPayload,
  VerificationLog,
  AISuggestionResponse,
  AISuggestionRequest,
  User,
  ApiResponse,
  ApiSuccess,
} from '../../shared/types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Standard fetch helper handling JSON responses, errors, and authentication headers.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      error: 'PARSE_ERROR',
      message: `Server returned HTTP ${response.status}`,
    }));

    if (!json.success) {
      throw new Error(json.message || json.error || 'API Request failed');
    }

    return (json as ApiSuccess<T>).data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as Error)?.name === 'AbortError') {
      throw new Error('Network request timed out');
    }
    throw err;
  }
}

// ── Auth APIs ──────────────────────────────────────────────

export async function syncUserWithBackend(
  token: string,
  payload: {
    fullName: string;
    email: string;
    university?: string;
    avatarUrl?: string;
  },
) {
  return apiRequest<UserProfile>(
    '/auth/sync',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchMyProfile(token: string) {
  return apiRequest<UserProfile>('/auth/me', { method: 'GET' }, token);
}

// ── Product APIs ───────────────────────────────────────────

export interface FetchProductsParams {
  search?: string;
  category?: ProductCategory;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export async function fetchProducts(params: FetchProductsParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.category) query.append('category', params.category);
  if (params.condition) query.append('condition', params.condition);
  if (params.minPrice !== undefined)
    query.append('minPrice', params.minPrice.toString());
  if (params.maxPrice !== undefined)
    query.append('maxPrice', params.maxPrice.toString());
  if (params.page !== undefined) query.append('page', params.page.toString());
  if (params.limit !== undefined) query.append('limit', params.limit.toString());

  const qs = query.toString();
  return apiRequest<Product[]>(`/products${qs ? `?${qs}` : ''}`);
}

export async function fetchProductById(id: string, token?: string | null) {
  return apiRequest<Product>(`/products/${id}`, { method: 'GET' }, token);
}

export async function fetchMyListings(token: string) {
  return apiRequest<Product[]>('/products/seller/me', { method: 'GET' }, token);
}

export async function createProduct(
  token: string,
  payload: CreateProductPayload,
) {
  return apiRequest<Product>(
    '/products',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateProduct(
  token: string,
  id: string,
  payload: UpdateProductPayload,
) {
  return apiRequest<Product>(
    `/products/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteProduct(token: string, id: string) {
  return apiRequest<null>(
    `/products/${id}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

// ── Image Upload API ───────────────────────────────────────

export async function uploadProductImages(
  token: string,
  imageUris: string[],
): Promise<string[]> {
  const formData = new FormData();

  imageUris.forEach((uri, index) => {
    const filename = uri.split('/').pop() || `photo_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // React Native FormData file object format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData.append('images', {
      uri,
      name: filename,
      type,
    } as any);
  });

  const url = `${API_BASE_URL}/upload/images`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do not manually set Content-Type for FormData in React Native; fetch sets the multipart boundary automatically
    },
    body: formData,
  });

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.message || json.error || 'Image upload failed');
  }

  return json.data.urls as string[];
}

// ── Admin Moderation APIs ──────────────────────────────────

export async function fetchPendingApprovals(token: string) {
  return apiRequest<Product[]>('/admin/pending', { method: 'GET' }, token);
}

export async function approveProduct(token: string, id: string) {
  return apiRequest<Product>(
    `/admin/products/${id}/approve`,
    {
      method: 'POST',
    },
    token,
  );
}

export async function rejectProduct(
  token: string,
  id: string,
  reason: string,
) {
  return apiRequest<Product>(
    `/admin/products/${id}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
    token,
  );
}

// ── Orders API ─────────────────────────────────────────────

export async function createOrder(token: string, payload: CreateOrderPayload) {
  return apiRequest<Order>(
    '/orders',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchMyBuyerOrders(token: string) {
  return apiRequest<Order[]>('/orders', { method: 'GET' }, token);
}

export async function fetchMySellerOrders(token: string) {
  return apiRequest<Order[]>('/orders/seller', { method: 'GET' }, token);
}

export async function fetchOrderById(token: string, id: string) {
  return apiRequest<Order>(`/orders/${id}`, { method: 'GET' }, token);
}

export async function updateOrderStatus(
  token: string,
  id: string,
  payload: UpdateOrderPayload,
) {
  return apiRequest<Order>(
    `/orders/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

// ── Wishlist API ───────────────────────────────────────────

export async function fetchWishlist(token: string) {
  return apiRequest<Product[]>('/wishlist', { method: 'GET' }, token);
}

export async function addToWishlist(token: string, productId: string) {
  return apiRequest<{ inWishlist: boolean; productId: string }>(
    `/wishlist/${productId}`,
    { method: 'POST' },
    token,
  );
}

export async function removeFromWishlist(token: string, productId: string) {
  return apiRequest<{ inWishlist: boolean; productId: string }>(
    `/wishlist/${productId}`,
    { method: 'DELETE' },
    token,
  );
}

export async function checkWishlist(token: string, productId: string) {
  return apiRequest<{ inWishlist: boolean }>(
    `/wishlist/check/${productId}`,
    { method: 'GET' },
    token,
  );
}

// ── Messages API ───────────────────────────────────────────

export async function fetchConversations(token: string) {
  return apiRequest<Conversation[]>('/messages/conversations', { method: 'GET' }, token);
}

export async function fetchOrderMessages(token: string, orderId: string) {
  return apiRequest<Message[]>(`/messages/order/${orderId}`, { method: 'GET' }, token);
}

export async function sendMessage(token: string, payload: SendMessagePayload) {
  return apiRequest<Message>(
    '/messages',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function startConversationWithSeller(token: string, productId: string) {
  return apiRequest<{ orderId: string; isNew: boolean }>(
    '/messages/start',
    {
      method: 'POST',
      body: JSON.stringify({ productId }),
    },
    token,
  );
}

// ── Notifications API ──────────────────────────────────────

export async function fetchNotifications(token: string) {
  return apiRequest<AppNotification[]>('/notifications', { method: 'GET' }, token);
}

export async function markNotificationAsRead(token: string, id: string) {
  return apiRequest<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' }, token);
}

export async function markAllNotificationsAsRead(token: string) {
  return apiRequest<{ success: boolean; message: string }>('/notifications/read-all', { method: 'PATCH' }, token);
}

// ── AI Listing Assistant API ────────────────────────────────

export async function getAISuggestions(token: string, payload: AISuggestionRequest) {
  return apiRequest<AISuggestionResponse>(
    '/ai/suggest',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function evaluateListingQuality(token: string, payload: AISuggestionRequest) {
  return apiRequest<{ qualityScore: number; feedback: string[]; improvements: string[]; isQualityPass: boolean }>(
    '/ai/evaluate-listing',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ── Campus Meetup Locations API ─────────────────────────────

export async function fetchMeetupLocations() {
  return apiRequest<CampusMeetupLocation[]>('/meetup-locations', { method: 'GET' });
}

export async function fetchMeetupLocationById(id: string) {
  return apiRequest<CampusMeetupLocation>(`/meetup-locations/${id}`, { method: 'GET' });
}

// ── Community Moderation & Reports API ──────────────────────

export async function submitReport(token: string, payload: CreateReportPayload) {
  return apiRequest<CommunityReport>(
    '/reports',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ── Digital Payments API ────────────────────────────────────

export async function initiatePayment(token: string, payload: InitiatePaymentPayload) {
  return apiRequest<{
    orderId: string;
    amount: number;
    method: string;
    upiVpa: string;
    transactionRef: string;
    isDemoPayment: boolean;
    note: string;
  }>(
    '/payments/initiate',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function verifyPayment(token: string, payload: VerifyPaymentPayload) {
  return apiRequest<PaymentTransaction>(
    '/payments/verify',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ── Returns & Refunds API ───────────────────────────────────

export async function submitReturnRequest(token: string, payload: CreateReturnPayload) {
  return apiRequest<ReturnRequest>(
    '/returns',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function fetchBuyerReturns(token: string) {
  return apiRequest<ReturnRequest[]>('/returns/buyer', { method: 'GET' }, token);
}

export async function fetchSellerReturns(token: string) {
  return apiRequest<ReturnRequest[]>('/returns/seller', { method: 'GET' }, token);
}

export async function updateReturnStatus(
  token: string,
  id: string,
  payload: { status: 'approved' | 'rejected' | 'refunded'; sellerNotes?: string },
) {
  return apiRequest<ReturnRequest>(
    `/returns/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

// ── Extended Admin & Moderation API ─────────────────────────

export async function requestChangesOnProduct(
  token: string,
  id: string,
  changesRequested: string,
) {
  return apiRequest<Product>(
    `/admin/products/${id}/request-changes`,
    { method: 'POST', body: JSON.stringify({ changesRequested }) },
    token,
  );
}

export async function fetchProductVerifications(token: string, productId: string) {
  return apiRequest<VerificationLog[]>(`/admin/verifications/${productId}`, { method: 'GET' }, token);
}

export async function fetchAdminReports(token: string) {
  return apiRequest<CommunityReport[]>('/admin/reports', { method: 'GET' }, token);
}

export async function resolveAdminReport(
  token: string,
  id: string,
  payload: { status: 'resolved' | 'dismissed'; resolutionNotes?: string },
) {
  return apiRequest<CommunityReport>(
    `/admin/reports/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export async function removeProductByAdmin(token: string, id: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/admin/products/${id}`,
    { method: 'DELETE' },
    token,
  );
}

export async function fetchAdminUsers(token: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<User[]>(`/admin/users${query}`, { method: 'GET' }, token);
}

export async function fetchAdminUserById(token: string, id: string) {
  return apiRequest<User & { activeListings: number; reportsAgainstUser: number }>(
    `/admin/users/${id}`,
    { method: 'GET' },
    token,
  );
}

export async function updateUserStatus(token: string, id: string, status: 'active' | 'suspended') {
  return apiRequest<User>(
    `/admin/users/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
}


