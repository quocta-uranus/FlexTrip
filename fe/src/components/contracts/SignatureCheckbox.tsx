import { ShieldCheck } from 'lucide-react';

interface SignatureCheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function SignatureCheckbox({ checked, onChange, disabled }: SignatureCheckboxProps) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all"
      style={{
        borderColor: checked ? '#2a7bd9' : '#DCEFFB',
        background: checked ? 'rgba(42,123,217,0.04)' : '#fff',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className="h-5 w-5 rounded flex items-center justify-center border-2 transition-all"
          style={{
            borderColor: checked ? '#2a7bd9' : '#cbd5e1',
            background: checked ? '#2a7bd9' : '#fff',
          }}
        >
          {checked && (
            <svg viewBox="0 0 12 10" className="h-3 w-3" fill="none" stroke="white" strokeWidth="2">
              <polyline points="1.5,5 4.5,8 10.5,1" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" style={{ color: checked ? '#2a7bd9' : '#94a3b8' }} />
          <span className="text-sm font-semibold" style={{ color: '#0f1729' }}>
            Tôi đã đọc và đồng ý với toàn bộ điều khoản hợp đồng
          </span>
        </div>
        <p className="text-xs" style={{ color: '#8694ad' }}>
          Bao gồm bảng mức phạt, chính sách hoàn cọc và điều kiện giao nhận thiết bị.
          Ký điện tử có giá trị pháp lý theo Luật Giao dịch điện tử Việt Nam.
        </p>
      </div>
    </label>
  );
}
