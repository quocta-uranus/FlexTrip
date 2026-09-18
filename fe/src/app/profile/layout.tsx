// import { ProfileSidebar } from '@/components/profile/profile-sidebar';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* <ProfileSidebar /> */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
