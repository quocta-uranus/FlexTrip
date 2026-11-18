'use client';

import { FileDown } from 'lucide-react';
import { printContract, type PrintableContract } from '@/lib/printContract';

interface ExportPdfButtonProps {
  contract: PrintableContract;
  travelerName?: string | null;
  providerName?: string | null;
  className?: string;
}

/** Mở bản in A4 của hợp đồng; người dùng chọn "Lưu dưới dạng PDF" trong hộp thoại in. */
export function ExportPdfButton({ contract, travelerName, providerName, className }: ExportPdfButtonProps) {
  return (
    <button
      type="button"
      onClick={() => printContract(contract, travelerName || 'Khách thuê', providerName || 'Người cho thuê')}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-lg border border-[#DCEFFB] bg-white px-3 py-1.5 text-xs font-semibold text-[#2a7bd9] transition hover:bg-[#f6fbfe]'
      }
    >
      <FileDown className="h-3.5 w-3.5" />
      Xuất PDF
    </button>
  );
}
