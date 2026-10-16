'use client';

import { useRouter } from 'next/navigation';
import { useCreateListing } from '@/hooks/useListings';
import { ListingForm } from '@/components/listing/listing-form';

export default function CreateListingPage() {
  const router = useRouter();
  const { mutate: createListing, isPending, error } = useCreateListing();

  return (
    <ListingForm
      mode="create"
      isPending={isPending}
      errorMessage={error?.message}
      onSubmit={(payload) =>
        createListing(payload, { onSuccess: () => router.push('/dashboard/listings') })
      }
    />
  );
}
