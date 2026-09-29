export type Role = 'TRAVELER' | 'PROVIDER' | 'ADMIN' | 'STAFF';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REMOVED';
export type ListingTab = 'FLAGGED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | 'ALL';
export type ModerateAction = 'HIDE' | 'REMOVE' | 'RESTORE' | 'KEEP';
export type DisputeType = 'REFUND_REQUEST' | 'PAYMENT_DISPUTE' | 'CANCELLATION_DISPUTE' | 'DAMAGE_CLAIM';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'PENDING_INFO' | 'ESCALATED' | 'RESOLVED' | 'REJECTED';
export type DisputePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PayoutStatus = 'PENDING' | 'PAID' | 'ON_HOLD';
export type Reconciliation = 'MATCHED' | 'MISMATCH' | 'PENDING';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDING' | 'REFUNDED';
export type AuditModule = 'USER' | 'MODERATION' | 'DISPUTE' | 'FINANCE' | 'CONFIG' | 'STAFF' | 'KYC' | 'PROVIDER';

export interface Paginated<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }
export interface Ref { id: string; name: string }
export interface Kpi { value: number; change: number | null }

// ADMIN-01
export interface AdminUser {
  id: string; name: string; email: string; phone: string | null; avatarUrl: string | null;
  roles: Role[]; status: UserStatus; kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null; isKycVerified: boolean;
  bookingsCount: number; suspensionReason: string | null; suspendedAt: string | null; createdAt: string; lastActiveAt: string | null;
}
export interface AdminUserStats { total: number; active: number; suspended: number; disabled: number; newThisMonth: number }

// ADMIN-03
export interface AdminListing {
  id: string; title: string; price: number; currency: string; location: string; category: string; imageUrl: string | null;
  status: ListingStatus; provider: Ref; openFlagsCount: number; latestFlag: { reason: string; createdAt: string } | null; createdAt: string;
}
export interface ListingFlag {
  id: string; reason: string; source: 'USER' | 'SYSTEM'; status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  reporter: Ref | null; resolvedBy: Ref | null; resolvedAt: string | null; resolutionNote: string | null; createdAt: string;
}
export interface ListingModerationStats { flagged: number; suspended: number; removedThisWeek: number; avgResolutionHours: number | null }

// ADMIN-04
export interface AdminDispute {
  id: string; bookingId: string; type: DisputeType; status: DisputeStatus; priority: DisputePriority;
  traveler: Ref; provider: Ref & { shopName: string | null }; amount: number; requestedAmount: number | null; reason: string; createdAt: string;
}
export interface AdminDisputeDetail extends AdminDispute {
  description: string | null; resolution: string | null; refundAmount: number | null;
  openedBy: Ref; handledBy: Ref | null; resolvedAt: string | null;
  booking: { id: string; status: BookingStatus; startDate: string; endDate: string; totalPrice: number; listing: { id: string; title: string; location: string } };
  payment: { id: string; amount: number; platformFee: number; status: PaymentStatus; method: string; transactionId: string | null } | null;
  contract: { status: string; signedAt: string | null; checkInPhoto: string | null; checkOutPhoto: string | null } | null;
  history: AuditLogItem[];
}
export interface DisputeStats { byStatus: Record<DisputeStatus, number>; openAmount: number }

// ADMIN-05
export interface AdminTransaction {
  id: string; bookingId: string; amount: number; platformFee: number; providerNet: number; status: PaymentStatus;
  method: string; transactionId: string | null; provider: Ref; createdAt: string;
}
export interface FinanceSummary {
  from: string; to: string; totalRevenue: number; platformCommission: number; providerPayouts: number; refundVolume: number;
  changes: Record<'totalRevenue' | 'platformCommission' | 'providerPayouts' | 'refundVolume', number | null>;
  reconciliation: { matched: number; pending: number; mismatch: number };
}
export interface AdminPayout {
  id: string; provider: Ref & { shopName: string | null; bankAccount: string | null };
  periodStart: string; periodEnd: string; paymentCount: number; grossAmount: number; commissionAmount: number; expectedNet: number;
  actualPaid: number | null; discrepancy: number | null; reconciliation: Reconciliation; transferRef: string | null;
  status: PayoutStatus; note: string | null; paidAt: string | null;
}
export interface GeneratePayoutsResult { created: number; updated: number; skipped: number }

// ADMIN-06
export interface AnalyticsOverview {
  from: string; to: string;
  kpis: { totalRevenue: Kpi; platformCommission: Kpi; activeUsers: Kpi; cancellationRate: Kpi };
  topMetrics: { avgBookingValue: number; totalBookings: number; avgRating: number | null; providerCount: number; listingCount: number };
  revenueByCategory: { category: string; revenue: number; percent: number }[];
  userGrowth: { newTravelers: Kpi; newProviders: Kpi; repeatBookers: Kpi; churnedUsers: Kpi };
}
export type Granularity = 'day' | 'week' | 'month';
export interface TimeseriesPoint { bucket: string; revenue: number; bookings: number; newUsers: number }
export interface AdminDashboard { openDisputes: number; openFlags: number; pendingKyc: number; resolvedToday: number; recentActivity: AuditLogItem[] }

// ADMIN-08
export interface ConfigItem {
  key: string; label: string; description: string; unit: string; min: number; max: number; step: number;
  default: number; value: number; updatedAt: string | null; updatedBy: Ref | null;
}
export interface ConfigGroup { group: string; label: string; items: ConfigItem[] }

// ADMIN-09
export interface AuditLogItem {
  id: string; createdAt: string; actor: (Ref & { email?: string }) | null; actorRole: Role | null; action: string;
  module: AuditModule; entityType: string; entityId: string | null; before: unknown; after: unknown; ipAddress: string | null;
}
export interface AuditStats { actionsToday: number; activeActorsToday: number; configChangesWeek: number; suspensionsWeek: number }

// ADMIN-10
export interface AdminStaff {
  id: string; name: string; email: string; phone: string | null; employeeCode: string; regions: string[]; isActive: boolean;
  userStatus: UserStatus; openAssignments: number; completedAssignments: number; lastActiveAt: string | null; passwordSet: boolean;
}
export interface StaffStats { total: number; active: number; openAssignments: number; unassignedBookings: number }
export interface StaffRule { id: string; name: string; region: string; priority: number; isActive: boolean; staff: Ref & { employeeCode: string | null } }
export interface AssignableBooking {
  id: string; status: BookingStatus; startDate: string; endDate: string;
  listing: { id: string; title: string; location: string }; traveler: Ref; assignedStaff: (Ref & { employeeCode: string | null }) | null;
}
