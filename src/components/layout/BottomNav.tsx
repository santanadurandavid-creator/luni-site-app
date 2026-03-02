
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, FileText, ClipboardCheck, Bell, Video, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const navLinks = [
  { href: '/profile', label: 'Inicio', icon: Home },
  { href: '/clases', label: 'Clases', icon: BookOpen },
  { href: '/content', label: 'Contenido', icon: FileText },
  { href: '/quizzes', label: 'Quizzes', icon: ClipboardCheck },
  { href: '/updates', label: 'Novedades', icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl shadow-lg">
      <div className="flex justify-around h-16 items-center px-2">
        {(() => {
          const adminHref = user?.role === 'content_creator' ? "/admin/content" :
            user?.role === 'ventas' ? "/admin/sales" :
              (user?.role === 'support' || user?.role === 'supervisor_support') ? "/admin/support" :
                "/admin";

          const showAdmin = user?.role === 'admin' || user?.role === 'support' || user?.role === 'supervisor_support' || user?.role === 'content_creator' || user?.role === 'ventas';

          const links = [...navLinks];
          if (showAdmin) {
            links.push({ href: adminHref, label: 'Admin', icon: Shield });
          }

          return links.map((link) => {
            const isActive = pathname === link.href || (link.href === '/admin' && pathname.startsWith('/admin'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex flex-col items-center justify-center text-[10px] w-full h-full transition-all duration-200 rounded-lg mx-0.5 relative overflow-hidden',
                  isActive
                    ? 'text-primary bg-primary/10 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5',
                  link.icon === Shield && 'text-red-500'
                )}
              >
                <link.icon className={cn(
                  "h-5 w-5 mb-1 transition-all duration-200",
                  isActive ? "scale-110" : "group-hover:scale-105"
                )} />
                <span className={cn(
                  "font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}>{link.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full"></div>
                )}
              </Link>
            );
          });
        })()}
      </div>
    </nav>
  );
}
