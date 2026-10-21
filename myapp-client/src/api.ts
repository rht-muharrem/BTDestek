import type {
  AdminUser,
  AiSuggestion,
  SolutionSuggestion,
  BrandSettings,
  AppNotification,
  AuditLogEntry,
  Asset,
  AssetTicketHistoryItem,
  AssetType,
  AuthUser,
  ReportSummary,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './types';

// Geliştirmede backend ayrı portta (5000), üretimde ise backend hem API'yi hem
// React dosyalarını aynı adresten sunar — bu yüzden üretimde göreli yol kullanılır.
// .env.development içindeki VITE_API_URL değeri geliştirme adresini belirler.
const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `İstek başarısız: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

// ---------- AUTH ----------

interface AuthResponse {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

function toAuthUser(res: AuthResponse): AuthUser {
  return { userId: res.userId, fullName: res.fullName, email: res.email, role: res.role as AuthUser['role'] };
}

export const authApi = {
  windowsLogin: async (): Promise<{ token: string; user: AuthUser } | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/windows-login`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const data = (await res.json()) as AuthResponse;
      return { token: data.token, user: toAuthUser(data) };
    } catch {
      return null;
    }
  },

  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => handleResponse<AuthResponse>(r));
    return { token: res.token, user: toAuthUser(res) };
  },

  register: async (fullName: string, email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    }).then((r) => handleResponse<AuthResponse>(r));
    return { token: res.token, user: toAuthUser(res) };
  },
};

// ---------- TICKETS ----------

export interface TicketFilters {
  search?: string;
  status?: TicketStatus | 'All';
  category?: TicketCategory | 'All';
}

function buildQuery(filters?: TicketFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'All') params.set('status', filters.status);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const ticketsApi = {
  getAll: (filters?: TicketFilters): Promise<Ticket[]> =>
    fetch(`${API_BASE_URL}/tickets${buildQuery(filters)}`, { headers: authHeaders() }).then((r) =>
      handleResponse<Ticket[]>(r)
    ),

  create: (
    title: string,
    description: string,
    priority: TicketPriority,
    category: TicketCategory,
    assetId?: number | null
  ): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ title, description, priority, category, assetId: assetId ?? null }),
    }).then((r) => handleResponse<Ticket>(r)),

  linkAsset: (id: number, assetId: number | null): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets/${id}/link-asset`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ assetId }),
    }).then((r) => handleResponse<Ticket>(r)),

  assignToSelf: (id: number): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets/${id}/assign`, { method: 'PUT', headers: authHeaders() }).then((r) =>
      handleResponse<Ticket>(r)
    ),

  updateStatus: (id: number, status: TicketStatus): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets/${id}/status`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ status }),
    }).then((r) => handleResponse<Ticket>(r)),

  confirmClose: (id: number): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets/${id}/confirm-close`, { method: 'POST', headers: authHeaders() }).then((r) =>
      handleResponse<Ticket>(r)
    ),

  rate: (id: number, rating: number): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets/${id}/rate`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ rating }),
    }).then((r) => handleResponse<Ticket>(r)),

  getComments: (id: number): Promise<TicketComment[]> =>
    fetch(`${API_BASE_URL}/tickets/${id}/comments`, { headers: authHeaders() }).then((r) =>
      handleResponse<TicketComment[]>(r)
    ),

  addComment: (id: number, message: string): Promise<TicketComment> =>
    fetch(`${API_BASE_URL}/tickets/${id}/comments`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ message }),
    }).then((r) => handleResponse<TicketComment>(r)),

  getAttachments: (id: number): Promise<TicketAttachment[]> =>
    fetch(`${API_BASE_URL}/tickets/${id}/attachments`, { headers: authHeaders() }).then((r) =>
      handleResponse<TicketAttachment[]>(r)
    ),

  addAttachment: (id: number, fileName: string, contentType: string, dataBase64: string): Promise<TicketAttachment> =>
    fetch(`${API_BASE_URL}/tickets/${id}/attachments`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ fileName, contentType, dataBase64 }),
    }).then((r) => handleResponse<TicketAttachment>(r)),

  merge: (id: number, targetTicketId: number): Promise<Ticket> =>
    fetch(`${API_BASE_URL}/tickets/${id}/merge`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ targetTicketId }),
    }).then((r) => handleResponse<Ticket>(r)),

  bulkAssign: (ticketIds: number[]): Promise<Ticket[]> =>
    fetch(`${API_BASE_URL}/tickets/bulk/assign`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ ticketIds }),
    }).then((r) => handleResponse<Ticket[]>(r)),

  bulkUpdateStatus: (ticketIds: number[], status: TicketStatus): Promise<Ticket[]> =>
    fetch(`${API_BASE_URL}/tickets/bulk/status`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ ticketIds, status }),
    }).then((r) => handleResponse<Ticket[]>(r)),
};

// ---------- NOTIFICATIONS ----------

export const notificationsApi = {
  getAll: (): Promise<AppNotification[]> =>
    fetch(`${API_BASE_URL}/notifications`, { headers: authHeaders() }).then((r) =>
      handleResponse<AppNotification[]>(r)
    ),

  markRead: (id: number): Promise<void> =>
    fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT', headers: authHeaders() }).then((r) =>
      handleResponse<void>(r)
    ),

  markAllRead: (): Promise<void> =>
    fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PUT', headers: authHeaders() }).then((r) =>
      handleResponse<void>(r)
    ),
};

// ---------- ADMIN (USERS) ----------

export const usersApi = {
  getAll: (): Promise<AdminUser[]> =>
    fetch(`${API_BASE_URL}/users`, { headers: authHeaders() }).then((r) => handleResponse<AdminUser[]>(r)),

  updateRole: (id: number, role: 'Requester' | 'ITStaff'): Promise<void> =>
    fetch(`${API_BASE_URL}/users/${id}/role`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ role }),
    }).then((r) => handleResponse<void>(r)),
};

// ---------- REPORTS ----------

export const reportsApi = {
  summary: (): Promise<ReportSummary> =>
    fetch(`${API_BASE_URL}/reports/summary`, { headers: authHeaders() }).then((r) =>
      handleResponse<ReportSummary>(r)
    ),
};

export const auditApi = {
  getAll: (filters?: { entityType?: string; action?: string; search?: string }): Promise<AuditLogEntry[]> => {
    const params = new URLSearchParams();
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.action) params.set('action', filters.action);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return fetch(`${API_BASE_URL}/audit${qs ? `?${qs}` : ''}`, { headers: authHeaders() }).then((r) =>
      handleResponse<AuditLogEntry[]>(r)
    );
  },
};

// ---------- ASSETS (Envanter) ----------

export const assetsApi = {
  getAll: (filters?: { search?: string; type?: AssetType | 'All' }): Promise<Asset[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.type && filters.type !== 'All') params.set('type', filters.type);
    const qs = params.toString();
    return fetch(`${API_BASE_URL}/assets${qs ? `?${qs}` : ''}`, { headers: authHeaders() }).then((r) =>
      handleResponse<Asset[]>(r)
    );
  },

  getMine: (): Promise<Asset[]> =>
    fetch(`${API_BASE_URL}/assets/mine`, { headers: authHeaders() }).then((r) => handleResponse<Asset[]>(r)),

  getById: (id: number): Promise<Asset> =>
    fetch(`${API_BASE_URL}/assets/${id}`, { headers: authHeaders() }).then((r) => handleResponse<Asset>(r)),

  getTicketHistory: (id: number): Promise<AssetTicketHistoryItem[]> =>
    fetch(`${API_BASE_URL}/assets/${id}/tickets`, { headers: authHeaders() }).then((r) =>
      handleResponse<AssetTicketHistoryItem[]>(r)
    ),

  create: (payload: {
    assetTag: string;
    type: AssetType;
    brand?: string;
    model?: string;
    serialNumber?: string;
    ipAddress?: string;
    macAddress?: string;
    operatingSystem?: string;
    ram?: string;
    cpu?: string;
    assignedUserId?: number | null;
    department?: string;
    location?: string;
    notes?: string;
  }): Promise<Asset> =>
    fetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Asset>(r)),

  update: (
    id: number,
    payload: {
      type: AssetType;
      brand?: string;
      model?: string;
      serialNumber?: string;
      ipAddress?: string;
      macAddress?: string;
      operatingSystem?: string;
      ram?: string;
      cpu?: string;
      assignedUserId?: number | null;
      department?: string;
      location?: string;
      notes?: string;
      isRetired: boolean;
    }
  ): Promise<Asset> =>
    fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Asset>(r)),

  remove: (id: number): Promise<void> =>
    fetch(`${API_BASE_URL}/assets/${id}`, { method: 'DELETE', headers: authHeaders() }).then((r) =>
      handleResponse<void>(r)
    ),
};

// ---------- AI ÖNERİ ----------

export const aiApi = {
  suggest: (title: string, description: string): Promise<AiSuggestion> =>
    fetch(`${API_BASE_URL}/ai/suggest`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ title, description }),
    }).then((r) => handleResponse<AiSuggestion>(r)),

  suggestSolution: (title: string, description: string): Promise<SolutionSuggestion> =>
    fetch(`${API_BASE_URL}/ai/suggest-solution`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ title, description }),
    }).then((r) => handleResponse<SolutionSuggestion>(r)),
};

// ---------- MARKA AYARLARI ----------

export const brandingApi = {
  get: (): Promise<BrandSettings> =>
    fetch(`${API_BASE_URL}/settings/branding`).then((r) => handleResponse<BrandSettings>(r)),

  update: (companyName: string, logoBase64: string | null, logoContentType: string | null): Promise<BrandSettings> =>
    fetch(`${API_BASE_URL}/settings/branding`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ companyName, logoBase64, logoContentType }),
    }).then((r) => handleResponse<BrandSettings>(r)),
};
