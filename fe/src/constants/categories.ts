import {
  Camera, Tent, Footprints, Waves, Luggage, Baby,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryMeta {
  value: ListingCategory;
  label: string;
  description: string;
  // Heading the category sits under in the all-categories panel of the search page.
  group: string;
  emoji: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
}

export const LISTING_CATEGORIES: CategoryMeta[] = [
  {
    value: 'CAMERA_GEAR',
    label: 'Thiết bị quay/chụp',
    description: 'GoPro, DJI Osmo, camera, tripod, gimbal',
    group: 'Công nghệ và ghi hình',
    emoji: '📷',
    Icon: Camera,
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    value: 'CAMPING',
    label: 'Camping',
    description: 'Lều, túi ngủ, bàn ghế, đèn, bếp dã ngoại',
    group: 'Ngoài trời',
    emoji: '⛺',
    Icon: Tent,
    color: '#059669',
    bg: '#f0fdf4',
  },
  {
    value: 'TREKKING',
    label: 'Trekking',
    description: 'Ba lô, gậy trekking, đèn pin, bình nước, áo mưa',
    group: 'Ngoài trời',
    emoji: '🥾',
    Icon: Footprints,
    color: '#2a7bd9',
    bg: '#eff6ff',
  },
  {
    value: 'BEACH',
    label: 'Du lịch biển',
    description: 'SUP, kayak, phao, lều biển, ghế biển',
    group: 'Ngoài trời',
    emoji: '🏖️',
    Icon: Waves,
    color: '#0891b2',
    bg: '#ecfeff',
  },
  {
    value: 'TRAVEL_ESSENTIALS',
    label: 'Tiện ích du lịch',
    description: 'Vali, balo, ổ cắm, adapter, cân hành lý',
    group: 'Gia đình và du lịch',
    emoji: '🧳',
    Icon: Luggage,
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    value: 'FAMILY',
    label: 'Gia đình',
    description: 'Ghế trẻ em, xe đẩy du lịch, cũi du lịch',
    group: 'Gia đình và du lịch',
    emoji: '👨‍👩‍👧',
    Icon: Baby,
    color: '#db2777',
    bg: '#fdf2f8',
  },
] as const;

export type ListingCategory =
  | 'CAMERA_GEAR'
  | 'CAMPING'
  | 'TREKKING'
  | 'BEACH'
  | 'TRAVEL_ESSENTIALS'
  | 'FAMILY';

export const CATEGORY_VALUES = LISTING_CATEGORIES.map((c) => c.value) as [ListingCategory, ...ListingCategory[]];

// Older listings still carry the combined category the app later split into Camping and Trekking.
export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  ...Object.fromEntries(LISTING_CATEGORIES.map((c) => [c.value, c.label])),
  CAMPING_TREKKING: 'Camping & Trekking',
} as unknown as Record<ListingCategory, string>;

export const CATEGORY_ICONS: Record<ListingCategory, string> = Object.fromEntries(
  LISTING_CATEGORIES.map((c) => [c.value, c.emoji]),
) as Record<ListingCategory, string>;

export const CATEGORY_ICON_MAP: Record<ListingCategory, LucideIcon> = {
  CAMERA_GEAR: Camera,
  CAMPING: Tent,
  TREKKING: Footprints,
  BEACH: Waves,
  TRAVEL_ESSENTIALS: Luggage,
  FAMILY: Baby,
};

export const CATEGORY_LUCIDE_ICONS: Record<ListingCategory, LucideIcon> = CATEGORY_ICON_MAP;

export const CATEGORY_META: Record<ListingCategory, CategoryMeta> = Object.fromEntries(
  LISTING_CATEGORIES.map((c) => [c.value, c]),
) as Record<ListingCategory, CategoryMeta>;
