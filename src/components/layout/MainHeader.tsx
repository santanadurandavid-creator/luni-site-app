
'use client';

import { BookOpen, FileText, ClipboardCheck, Bell, Home, Shield, Video, Podcast } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ProfileMenu } from './ProfileMenu';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Notifications } from './Notifications';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import type { Setting, ContentItem } from '@/lib/types';
import { SocialMediaModal } from '@/components/auth/SocialMediaModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { LiveClassModal } from '@/components/shared/LiveClassModal';
import { Radio } from 'lucide-react';
import { Badge } from '../ui/badge';

export function MainHeader() {
  const pathname = usePathname();
  const { user, activePodcast, isPodcastPlaying, restorePlayer } = useAuth();
  const { t } = useLanguage();

  const navLinks = [
    { href: '/profile', label: t('home'), icon: Home },
    { href: '/clases', label: t('classes'), icon: BookOpen },
    { href: '/content', label: t('content'), icon: FileText },
    { href: '/quizzes', label: t('quizzes'), icon: ClipboardCheck },
    { href: '/updates', label: t('updates'), icon: Bell },
  ];
  const [logoUrl, setLogoUrl] = useState<string>('https://firebasestorage.googleapis.com/v0/b/luni-site-res01.firebasestorage.app/o/favicon.png?alt=media&token=3e46c93a-1ab3-4928-8824-01bc4745ef89');
  const [liveClasses, setLiveClasses] = useState<ContentItem[]>([]);
  const [selectedLiveClass, setSelectedLiveClass] = useState<ContentItem | null>(null);

  const userIsAdminOrSupport = user?.role === 'admin' || user?.role === 'support' || user?.role === 'supervisor_support';

  useEffect(() => {
    const { db } = getFirebaseServices();
    const q = query(collection(db, 'content'), where('type', '==', 'class'), where('classDetails.isLive', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
      setLiveClasses(classes);
    });

    return () => unsubscribe();
  }, []);

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





  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="flex h-16 items-center px-4 md:px-6 w-full">
          <Link href="/profile" className="flex items-center space-x-3 mr-8 group md:hidden">
            <div className="relative h-10 w-10 rounded-lg overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
              <Image
                src={logoUrl}
                alt="Luni Site Logo"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="logo"
              />
            </div>
            <span className="font-bold font-headline text-lg hidden sm:inline-block text-foreground group-hover:text-primary transition-colors duration-200">Luni Site</span>
          </Link>

          {/* Live Class Indicators */}
          <div className="flex items-center gap-2 mr-4">
            {liveClasses.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                className="relative hover:bg-primary/10 transition-all duration-200"
                onClick={() => setSelectedLiveClass(item)}
                title="Clase En Vivo"
              >
                <Radio className="h-5 w-5 text-primary animate-pulse" />
                <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              </Button>
            ))}
          </div>

          <nav className="hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-3 py-2 rounded-md transition-all duration-200 hover:bg-primary/5',
                  pathname === link.href
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {activePodcast && (
              <Button
                variant="ghost"
                size="icon"
                onClick={restorePlayer}
                className="relative h-9 w-9 flex-shrink-0 hover:bg-primary/10 transition-all duration-200"
                title={t('playPodcast')}
              >
                <Podcast className={cn("h-5 w-5 transition-colors duration-200", isPodcastPlaying ? "text-primary" : "text-muted-foreground")} />
                {isPodcastPlaying && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
                )}
              </Button>
            )}
            {(userIsAdminOrSupport || user?.role === 'content_creator' || user?.role === 'ventas') && (
              <Link
                href={
                  user?.role === 'content_creator' ? "/admin/content" :
                    user?.role === 'ventas' ? "/admin/sales" :
                      (user?.role === 'support' || user?.role === 'supervisor_support') ? "/admin/support" :
                        "/admin"
                }
                className="flex-shrink-0"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                  title={t('adminPanel')}
                >
                  <Shield className="h-5 w-5" />
                </Button>
              </Link>
            )}



            <div className="flex-shrink-0">
              <Notifications />
            </div>
            <div className="flex-shrink-0">
              <ProfileMenu />
            </div>
          </div>
        </div>
      </header>
      <LiveClassModal
        item={selectedLiveClass}
        onClose={() => setSelectedLiveClass(null)}
      />
    </>
  );
}
