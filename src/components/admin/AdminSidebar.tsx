
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenCheck, Settings, GraduationCap, LogOut, Bell, MessageSquare, Image as ImageIcon, FileQuestion, Users, Palette, Star, Gamepad2, LifeBuoy, Smile, PanelLeft, Video, DollarSign, Swords, Monitor, Users2, LineChart, TrendingUp, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';

const allAdminLinks = [
  { href: '/admin', label: 'Dashboard', icon: Settings, roles: ['admin'] },
  { href: '/admin/clases', label: 'Gestión de Clases', icon: Video, roles: ['admin'] },
  { href: '/admin/content', label: 'Contenido', icon: BookOpenCheck, roles: ['admin', 'content_creator'] },
  { href: '/admin/tasks', label: 'Tareas', icon: ClipboardList, roles: ['admin', 'ventas', 'content_creator'] },
  { href: '/admin/professors', label: 'Profesores', icon: GraduationCap, roles: ['admin'] },
  { href: '/admin/exams', label: 'Exámenes', icon: FileQuestion, roles: ['admin'] },
  { href: '/admin/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
  { href: '/admin/sales-tracking', label: 'Seguimiento de Ventas', icon: LineChart, roles: ['admin'] },
  { href: '/admin/my-sales', label: 'Mis Ventas', icon: TrendingUp, roles: ['admin', 'ventas'] },
  { href: '/admin/sales', label: 'Usuarios para Venta', icon: Users2, roles: ['admin', 'ventas'] },
  { href: '/admin/ratings', label: 'Calificaciones App', icon: Star, roles: ['admin'] },
  { href: '/admin/support', label: 'Soporte', icon: LifeBuoy, roles: ['admin', 'support', 'supervisor_support'] },
  { href: '/admin/csat', label: 'Satisfacción Soporte', icon: Smile, roles: ['admin', 'supervisor_support'] },
  { href: '/admin/announcements', label: 'Novedades', icon: Bell, roles: ['admin'] },
  { href: '/admin/landing-page', label: 'Landing Page', icon: Monitor, roles: ['admin'] },
  { href: '/admin/notifications', label: 'Notificaciones', icon: MessageSquare, roles: ['admin'] },
  { href: '/admin/ads', label: 'Anuncios', icon: DollarSign, roles: ['admin'] },
  { href: '/admin/guides', label: 'Guías', icon: BookOpenCheck, roles: ['admin'] },
  { href: '/admin/challenges', label: 'Retos', icon: Swords, roles: ['admin'] },
  { href: '/admin/avatars', label: 'Avatares', icon: ImageIcon, roles: ['admin'] },
  { href: '/admin/appearance', label: 'Apariencia', icon: Palette, roles: ['admin'] },
  { href: '/admin/settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
];

interface AdminSidebarProps {
  onLinkClick?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
}

export function AdminSidebar({ onLinkClick, isMobile = false, isCollapsed = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>('https://firebasestorage.googleapis.com/v0/b/luni-site-res01.firebasestorage.app/o/favicon.png?alt=media&token=3e46c93a-1ab3-4928-8824-01bc4745ef89');

  useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const navLinks = user?.role ? allAdminLinks.filter(link => link.roles.includes(user.role!)) : [];

  const handleLogout = () => {
    logout();
    if (onLinkClick) onLinkClick();
  };


  const NavLink = ({ link }: { link: typeof navLinks[0] }) => {
    const isActive = link.href === '/admin' ? pathname === link.href : pathname.startsWith(link.href);

    const linkContent = (
      <div className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}>
        <link.icon className="h-4 w-4" />
        {!isCollapsed && <span className="whitespace-nowrap">{link.label}</span>}
      </div>
    );

    return isCollapsed ? (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={link.href}
              onClick={onLinkClick}
              className="block"
            >
              {linkContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {link.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      <Link
        href={link.href}
        onClick={onLinkClick}
      >
        {linkContent}
      </Link>
    );
  };

  return (
    <aside className="flex flex-col w-full h-full bg-background">
      {!isMobile && (
        <div className="flex items-center h-16 border-b px-4">
          <Link href="/profile" className="flex items-center space-x-2" onClick={onLinkClick}>
            <Image
              src={logoUrl}
              width={32}
              height={32}
              alt="Luni Site Logo"
              className="rounded-md"
            />
            {!isCollapsed && <span className="font-bold font-headline whitespace-nowrap">Luni Site</span>}
          </Link>
        </div>
      )}
      <nav className={cn("flex-1 p-2 space-y-2", isCollapsed && "px-2 py-4")}>
        {navLinks.map((link) => (
          <NavLink key={link.href} link={link} />
        ))}
      </nav>
      <div className={cn("p-2 mt-auto border-t", isCollapsed && "px-2 py-4")}>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="outline" className={cn("w-full", isCollapsed && "w-auto justify-center")} onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2 whitespace-nowrap">Cerrar Sesión</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                Cerrar Sesión
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
