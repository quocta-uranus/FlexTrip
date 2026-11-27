import type { Metadata } from 'next';
import { LegalCenter } from '@/components/legal/legal-center';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật | FlexTrip',
  description: 'Cách FlexTrip thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.',
};

export default function PrivacyPage() {
  return <LegalCenter initialTab="privacy" />;
}
