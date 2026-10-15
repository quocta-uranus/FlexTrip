import type { UserProfile } from '@/lib/api/client';

export const STAFF_PROFILE_PATH = '/staff/complete-profile';

export const STAFF_PROFILE_REQUIRED_FIELDS = [
  'name',
  'phone',
  'dateOfBirth',
  'gender',
  'nationality',
  'address',
  'emergencyContact',
] as const;

export type StaffProfileRequiredField = (typeof STAFF_PROFILE_REQUIRED_FIELDS)[number];

export function getMissingStaffProfileFields(
  user: Pick<UserProfile, StaffProfileRequiredField>,
): StaffProfileRequiredField[] {
  return STAFF_PROFILE_REQUIRED_FIELDS.filter((field) => {
    const value = user[field];
    return value == null || (typeof value === 'string' && value.trim() === '');
  });
}

export function isStaffProfileComplete(user: UserProfile): boolean {
  return getMissingStaffProfileFields(user).length === 0;
}
