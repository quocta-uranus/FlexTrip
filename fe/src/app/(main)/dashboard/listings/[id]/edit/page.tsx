'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useListing, useUpdateListing } from '@/hooks/useListings';
import { ListingForm } from '@/components/listing/listing-form';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: listing, isLoading, isError } = useListing(id);
  const { mutate: update, isPending, error } = useUpdateListing(id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f8fd]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a7bd9] border-t-transparent" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f3f8fd] text-center">
        <p className="text-base font-semibold text-slate-800">Không tìm thấy sản phẩm</p>
        <p className="text-sm text-slate-400">Sản phẩm không tồn tại hoặc bạn không có quyền chỉnh sửa.</p>
        <Link href="/dashboard/listings" className="rounded-xl bg-[#2a7bd9] px-5 py-2.5 text-sm font-semibold text-white">
          Về danh sách sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <ListingForm
      mode="edit"
      listing={listing}
      isPending={isPending}
      errorMessage={error?.message}
      onSubmit={(payload) =>
        update(payload, { onSuccess: () => router.push('/dashboard/listings') })
      }
    />
  );
}
