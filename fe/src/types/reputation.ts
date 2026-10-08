export type ReputationBadgeCode = 'TRUSTED_PROVIDER' | 'RELIABLE_TRAVELER';

export interface PublicReputationBadge {
  code: ReputationBadgeCode;
  label: string;
}

export interface ReputationMetric {
  key: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  operator: 'GTE' | 'LTE';
  met: boolean;
  progress: number;
}

export interface ReputationBadgeDetail extends PublicReputationBadge {
  description: string;
  achieved: boolean;
  progress: number;
  metrics: ReputationMetric[];
  reasons: string[];
}

export interface MyReputation {
  userId: string;
  badges: ReputationBadgeDetail[];
}
