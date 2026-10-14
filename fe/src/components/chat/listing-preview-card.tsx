import Link from 'next/link';
import type { ListingPreview } from '@/types/message';

export function ListingPreviewCard({ preview }: { preview: ListingPreview }) {
  const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: preview.currency }).format(preview.price);
  return (
    <Link
      href={`/listings/${preview.id}`}
      className="mt-2 flex w-64 overflow-hidden rounded-xl border border-[#DCEFFB] bg-white text-[#0f1729] transition-shadow hover:shadow-md"
    >
      {preview.imageUrl && <img src={preview.imageUrl} alt="" className="h-20 w-20 shrink-0 object-cover" />}
      <span className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2">
        <span className="truncate text-sm font-semibold">{preview.title}</span>
        <span className="truncate text-xs text-[#8694ad]">{preview.location}</span>
        <span className="text-xs font-semibold text-[#2a7bd9]">{price}</span>
      </span>
    </Link>
  );
}
