'use client';

import { ArrowUpDown } from 'lucide-react';
import { OptionSelect, type OptionSelectProps } from './option-select';

// Same values and meaning as the sort options the search API already accepts.
const OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating', label: 'Đánh giá cao' },
];

type SortSelectProps = Pick<OptionSelectProps, 'value' | 'onChange' | 'appearance' | 'className' | 'open' | 'onOpenChange'>;

export function SortSelect(props: SortSelectProps) {
  return <OptionSelect {...props} options={OPTIONS} placeholder="Sắp xếp" title="Sắp xếp theo" icon={ArrowUpDown} />;
}
