-- AlterTable
ALTER TABLE "TravelPreference" ADD COLUMN     "budgetScope" TEXT,
ADD COLUMN     "preferredCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
