import { PAGE_WIDTH } from '@/components/layout/page-header';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-background">
      <main className="flex-1 pb-10 pt-24 sm:pt-28">
        {/* Same container as every other provider page: the header stays on the left edge, while everything under it
            keeps a readable width and sits in the middle. */}
        <div className={`${PAGE_WIDTH} flex flex-col gap-7 [&>*:not(header):not(.fixed)]:mx-auto [&>*:not(header):not(.fixed)]:w-full [&>*:not(header):not(.fixed)]:max-w-4xl`}>
          {children}
        </div>
      </main>
    </div>
  );
}
