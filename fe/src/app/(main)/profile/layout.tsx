// import { ProfileSidebar } from '@/components/profile/profile-sidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-background">
      {/* <ProfileSidebar /> */}
      <main className="flex-1 px-12 py-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-7">{children}</div>
      </main>
    </div>
  );
}
