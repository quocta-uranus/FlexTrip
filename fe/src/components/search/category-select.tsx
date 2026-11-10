'use client';

import { Tent } from 'lucide-react';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { OptionSelect, type OptionSelectProps } from './option-select';

const OPTIONS = LISTING_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

type CategorySelectProps = Pick<OptionSelectProps, 'value' | 'onChange' | 'appearance' | 'className' | 'open' | 'onOpenChange'>;

export function CategorySelect(props: CategorySelectProps) {
  return (
    <OptionSelect
      {...props}
      options={OPTIONS}
      placeholder="Loại thiết bị"
      title="Loại thiết bị"
      icon={Tent}
      clearLabel="Tất cả loại thiết bị"
    />
  );
}
