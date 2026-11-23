import type { Metadata } from 'next';
import { LegalCenter } from '@/components/legal/legal-center';

export const metadata: Metadata = {
  title: 'Điều khoản dịch vụ | FlexTrip',
  description: 'Các điều khoản khi sử dụng nền tảng cho thuê thiết bị du lịch FlexTrip.',
};

export default function TermsPage() {
  return <LegalCenter initialTab="terms" />;
}
