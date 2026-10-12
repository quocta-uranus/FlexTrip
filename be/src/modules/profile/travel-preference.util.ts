import { ListingCategoryDto } from '../listings/listings.dto';

const TRIP_CATEGORIES: Record<string, readonly ListingCategoryDto[]> = {
  trekking: [ListingCategoryDto.TREKKING, ListingCategoryDto.CAMPING],
  camping: [ListingCategoryDto.CAMPING],
  beach: [ListingCategoryDto.BEACH],
};

export function preferredCategoriesForTrip(
  tripType: string,
  preferredCategories: readonly ListingCategoryDto[] = [],
): ListingCategoryDto[] {
  return preferredCategories.length
    ? [...preferredCategories]
    : [...(TRIP_CATEGORIES[tripType.trim().toLowerCase()] ?? [])];
}

export function matchesPreferredCategory(
  listingCategory: string,
  preferredCategories: readonly ListingCategoryDto[],
): boolean {
  // Compatibility is evaluated only for an actual legacy Listing value.
  if (listingCategory === 'CAMPING_TREKKING') {
    return (
      preferredCategories.includes(ListingCategoryDto.CAMPING) ||
      preferredCategories.includes(ListingCategoryDto.TREKKING)
    );
  }
  return preferredCategories.some((category) => category === listingCategory);
}
