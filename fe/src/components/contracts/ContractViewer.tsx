import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { PenaltyRule } from '@/types/contract';
import { PenaltyTable } from './PenaltyTable';

interface ContractViewerProps {
  terms: string;
  penaltyRules?: PenaltyRule[];
  conditionNote?: string | null;
  isHighValue?: boolean;
  collapsible?: boolean;
}

export function ContractViewer({
  terms,
  penaltyRules = [],
  conditionNote,
  isHighValue = false,
  collapsible = false,
}: ContractViewerProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#DCEFFB' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: '#f6fbfe', borderBottom: '1px solid #DCEFFB' }}
      >
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5" style={{ color: '#2a7bd9' }} />
          <span className="text-sm font-semibold" style={{ color: '#0f1729' }}>
            Hợp đồng thuê thiết bị
          </span>
          {isHighValue && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ background: '#fef3c7', color: '#b45309' }}
            >
              Giá trị cao
            </span>
          )}
        </div>
        {collapsible && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#2a7bd9' }}
          >
            {expanded ? (
              <><ChevronUp className="h-4 w-4" /> Thu gọn</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Xem đầy đủ</>
            )}
          </button>
        )}
      </div>

      {expanded && (
        <>
          {/* Penalty table */}
          {(penaltyRules.length > 0 || conditionNote) && (
            <div className="px-5 py-4 border-b" style={{ borderColor: '#DCEFFB', background: '#fffbf5' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#b45309' }}>
                Bảng mức phạt & tình trạng sản phẩm
              </p>
              <PenaltyTable rules={penaltyRules} conditionNote={conditionNote} />
            </div>
          )}

          {/* Full terms */}
          <div
            className="px-5 py-4 max-h-80 overflow-y-auto"
            style={{ background: '#fff' }}
          >
            <pre
              className="whitespace-pre-wrap text-xs leading-relaxed font-mono"
              style={{ color: '#374151' }}
            >
              {terms}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
