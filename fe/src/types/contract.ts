export type ContractStatus =
  | 'PENDING'
  | 'TRAVELER_SIGNED'
  | 'SIGNED'
  | 'ACTIVE'
  | 'CLOSED'
  | 'DISPUTED';

export interface PenaltyRule {
  item: string;
  description: string;
  minAmount: number;
  maxAmount: number;
}

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'sub'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'kv'; rows: Array<[string, string]> }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'images'; urls: string[] };

export interface DocArticle { title: string; blocks: DocBlock[] }

/** Hợp đồng v2: cấu trúc văn bản theo mẫu pháp lý, dựng ở backend. */
export interface ContractDocument {
  version: 2;
  title: string;
  nation: [string, string];
  number: string | null;
  issuedAt: string;
  basis: string[];
  opening: string;
  parties: Array<{ heading: string; rows: Array<[string, string]> }>;
  intro: string;
  articles: DocArticle[];
  closing: string;
  signers: Array<{ label: string; name: string }>;
}

export interface PublicSignature { image: string; signedAt: string | null; hash: string | null }

export interface Contract {
  id: string;
  bookingId: string;
  templateType: string;
  terms: string;
  penaltyRules: PenaltyRule[] | null;
  productConditionNote: string | null;
  isHighValue?: boolean;
  status: ContractStatus;
  travelerSignedAt: string | null;
  providerSignedAt: string | null;
  checkInPhotos: string[];
  checkOutPhotos: Array<{ url: string; uploadedBy: string; uploadedAt: string }> | null;
  idDocumentUrl: string | null;
  idDocumentType: string | null;
  insuranceOptIn: boolean;
  insuranceRef: string | null;
  createdAt: string;
  updatedAt: string;
  contractNo?: string | null;
  templateVersion?: number;
  content?: ContractDocument | null;
  travelerSignature?: PublicSignature | null;
  providerSignature?: PublicSignature | null;
  appendices?: DocArticle[];
}

export interface ContractPreview {
  templateVersion?: number;
  content?: ContractDocument | null;
  terms: string;
  penaltyRules: PenaltyRule[];
  isHighValue: boolean;
  productConditionNote: string | null;
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  PENDING: 'Chưa ký',
  TRAVELER_SIGNED: 'Traveler đã ký',
  SIGNED: 'Đã ký đầy đủ',
  ACTIVE: 'Đang hiệu lực',
  CLOSED: 'Đã đóng',
  DISPUTED: 'Tranh chấp',
};

export const CONTRACT_STATUS_COLOR: Record<ContractStatus, { bg: string; text: string; border: string }> = {
  PENDING:         { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  TRAVELER_SIGNED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  SIGNED:          { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  ACTIVE:          { bg: 'rgba(42,123,217,0.08)', text: '#1e5aa8', border: 'rgba(42,123,217,0.2)' },
  CLOSED:          { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  DISPUTED:        { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
};
