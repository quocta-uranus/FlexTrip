export type ReferralStatus = 'REGISTERED' | 'QUALIFIED' | 'REWARDED' | 'REJECTED';

export interface ReferralSummary {
  code: string;
  stats: { registered: number; rewarded: number; rejected: number };
  rewards: { refereeVoucherVnd: number; referrerVoucherVnd: number; monthlyCap: number };
}

export interface ReferralItem {
  id: string;
  refereeName: string;
  status: ReferralStatus;
  createdAt: string;
  rewardedAt: string | null;
}

export interface AdminReferral {
  id: string;
  code: string;
  status: ReferralStatus;
  rejectReason: string | null;
  createdAt: string;
  rewardedAt: string | null;
  referrer: { id: string; name: string; email: string };
  referee: { id: string; name: string; email: string };
}
