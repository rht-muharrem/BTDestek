export type UserRole = 'Requester' | 'ITStaff';
export type TicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Printer' | 'Access' | 'Other';

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdByUserId: number;
  createdByName: string;
  assignedToUserId: number | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  commentCount: number;
  attachmentCount: number;
  satisfactionRating: number | null;
  slaHours: number;
  mergedIntoTicketId: number | null;
  assetId: number | null;
  assetTag: string | null;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  authorName: string;
  authorRole: UserRole;
  message: string;
  createdAt: string;
}

export interface TicketAttachment {
  id: number;
  ticketId: number;
  fileName: string;
  contentType: string;
  dataBase64: string;
  uploadedByName: string;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  message: string;
  ticketId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  windowsUsername: string | null;
  createdAt: string;
  department: string | null;
  jobTitle: string | null;
  manager: string | null;
  phone: string | null;
  office: string | null;
}

export interface OverdueTicket {
  id: number;
  title: string;
  priority: TicketPriority;
  category: TicketCategory;
  hoursOpen: number;
  slaHours: number;
  assignedToName: string | null;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface ReportSummary {
  totalTickets: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  avgResolutionHours: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStaff: { staffName: string; assignedCount: number; resolvedCount: number }[];
  avgSatisfaction: number | null;
  ratedTicketCount: number;
  overdueTickets: OverdueTicket[];
  last30Days: DailyCount[];
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  Open: 'Açık',
  InProgress: 'İşleme Alındı',
  Resolved: 'Çözüldü',
  Closed: 'Kapatıldı',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  Low: 'Düşük',
  Medium: 'Orta',
  High: 'Yüksek',
  Critical: 'Kritik',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  Hardware: 'Donanım',
  Software: 'Yazılım',
  Network: 'Ağ',
  Printer: 'Yazıcı',
  Access: 'Erişim/Yetki',
  Other: 'Diğer',
};

export interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  performedByName: string;
  details: string;
  timestamp: string;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  TicketCreated: 'Talep Oluşturuldu',
  TicketAssigned: 'Talep Üstlenildi',
  StatusChanged: 'Durum Değişti',
  TicketClosedByUser: 'Kullanıcı Onayıyla Kapatıldı',
  TicketRated: 'Puanlandı',
  RoleChanged: 'Rol Değiştirildi',
  PriorityAutoEscalated: 'Öncelik Otomatik Yükseltildi',
};

export type AssetType =
  | 'Computer'
  | 'Laptop'
  | 'Monitor'
  | 'Printer'
  | 'Phone'
  | 'Switch'
  | 'Router'
  | 'AccessPoint'
  | 'Server'
  | 'UPS'
  | 'License'
  | 'Other';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  Computer: 'Bilgisayar',
  Laptop: 'Laptop',
  Monitor: 'Monitör',
  Printer: 'Yazıcı',
  Phone: 'Telefon',
  Switch: 'Switch',
  Router: 'Router',
  AccessPoint: 'Access Point',
  Server: 'Sunucu',
  UPS: 'UPS',
  License: 'Lisans',
  Other: 'Diğer',
};

export interface Asset {
  id: number;
  assetTag: string;
  type: AssetType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  operatingSystem: string | null;
  ram: string | null;
  cpu: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  department: string | null;
  location: string | null;
  notes: string | null;
  isRetired: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface AssetTicketHistoryItem {
  ticketId: number;
  title: string;
  status: TicketStatus;
  createdAt: string;
}

export interface SimilarTicketInfo {
  id: number;
  title: string;
  status: TicketStatus;
}

export interface AiSuggestion {
  category: TicketCategory;
  subcategory: string;
  priority: TicketPriority;
  suggestedTeam: string;
  reasoning: string;
  similarTickets: SimilarTicketInfo[];
}

export interface SolutionSuggestion {
  steps: string[];
}

export interface BrandSettings {
  companyName: string;
  logoDataUrl: string | null;
}
