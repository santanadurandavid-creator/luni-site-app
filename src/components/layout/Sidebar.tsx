'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, FileText, ClipboardCheck, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const navLinks = [
    { href: '/profile', label: 'Inicio', icon: Home },
    { href: '/clases', label: 'Clases', icon: BookOpen },
    { href: '/content', label: 'Contenido', icon: FileText },
    { href: '/quizzes', label: 'Quizzes', icon: ClipboardCheck },
    { href: '/updates', label: 'Novedades', icon: Bell },
];

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    logoUrl: string;
}

export function Sidebar({ isCollapsed, setIsCollapsed, logoUrl }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    if (!user) return null;

    return (
        <aside
            className={cn(
                'hidden md:flex fixed left-0 top-0 h-screen bg-background/95 backdrop-blur-xl border-r border-border/40 shadow-lg z-40 flex-col transition-all duration-300 ease-in-out',
                isCollapsed ? 'w-20' : 'w-64'
            )}
        >
            {/* Header con logo clickeable para toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                    "flex items-center gap-2 p-4 border-b border-border/40 w-full hover:bg-primary/5 transition-colors group",
                    isCollapsed && "justify-center"
                )}
                aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
            >
                <div className="relative h-8 w-8 rounded-lg overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all flex-shrink-0">
                    <img
                        src={logoUrl}
                        alt="Luni Site Logo"
                        className="w-full h-full object-cover"
                    />
                </div>
                {!isCollapsed && (
                    <span className="font-headline font-bold text-lg text-gray-700 dark:text-gray-300">
                        Luni Site
                    </span>
                )}
            </button>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-2 px-3">
                    {(() => {
                        const adminHref = user?.role === 'content_creator' ? "/admin/content" :
                            user?.role === 'ventas' ? "/admin/sales" :
                                (user?.role === 'support' || user?.role === 'supervisor_support') ? "/admin/support" :
                                    "/admin";

                        const showAdmin = user?.role === 'admin' || user?.role === 'support' || user?.role === 'supervisor_support' || user?.role === 'content_creator' || user?.role === 'ventas';

                        const links = [...navLinks];
                        if (showAdmin) {
                            links.push({ href: adminHref, label: 'Panel Admin', icon: Shield });
                        }

                        return links.map((link) => {
                            const isActive = pathname === link.href || (link.href === '/admin' && pathname.startsWith('/admin'));
                            return (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden',
                                            isActive
                                                ? 'bg-primary/10 text-primary shadow-md'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5',
                                            isCollapsed && 'justify-center',
                                            link.icon === Shield && 'text-red-500 hover:text-red-600'
                                        )}
                                    >
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                        )}

                                        <link.icon
                                            className={cn(
                                                'h-5 w-5 transition-all duration-200 flex-shrink-0',
                                                isActive ? 'scale-110' : 'group-hover:scale-105'
                                            )}
                                        />

                                        {!isCollapsed && (
                                            <span
                                                className={cn(
                                                    'text-sm font-medium transition-all duration-200',
                                                    isActive && 'font-semibold'
                                                )}
                                            >
                                                {link.label}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })
                    })()}

                </ul>
            </nav>


        </aside>
    );
}
