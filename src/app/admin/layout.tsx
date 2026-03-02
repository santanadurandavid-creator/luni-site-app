

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PremiumActivationModal } from '@/components/profile/PremiumActivationModal';
import { Suspense } from 'react';


function AdminLoadingScreen() {
  return (
    <div className="flex items-start">
      <div className="w-64 p-4 border-r min-h-screen">
        <Skeleton className="h-8 w-3/4 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user || (!user.isAdmin && user.role !== 'support' && user.role !== 'supervisor_support' && user.role !== 'content_creator' && user.role !== 'ventas')) {
        router.replace('/portal-gestion/login');
      }
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || (!user.isAdmin && user.role !== 'support' && user.role !== 'supervisor_support' && user.role !== 'content_creator' && user.role !== 'ventas')) {
    return <AdminLoadingScreen />;
  }

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <div className={cn("hidden md:block transition-all duration-300", isSidebarCollapsed ? "w-16" : "w-64")}>
        <AdminSidebar onLinkClick={handleLinkClick} isCollapsed={isSidebarCollapsed} />
      </div>
      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 flex flex-col">
                <SheetHeader className="border-b p-4">
                  <SheetTitle className="text-left">Menú de Admin</SheetTitle>
                </SheetHeader>
                <AdminSidebar onLinkClick={handleLinkClick} isMobile />
              </SheetContent>
            </Sheet>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

        </header>
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
        <Suspense fallback={null}>
          <PremiumActivationModal />
        </Suspense>
      </div>
    </div>
  );
}
