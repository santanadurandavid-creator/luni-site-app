'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, Mail, MessageCircle, Music } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';

interface SocialMediaModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const initialSettings: Setting = {
    id: '',
    key: '',
    value: null,
    category: '',
    facebookUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    whatsappUrl: '',
    contactEmail: '',
};

export function SocialMediaModal({ isOpen, setIsOpen }: SocialMediaModalProps) {
  const [settings, setSettings] = useState<Setting>(initialSettings);

  useEffect(() => {
    if (!isOpen) return;

    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        setSettings(data);
      }
    });
    return () => unsubscribe();
  }, [isOpen]);

  const socialMedia = [
    { name: 'Facebook', icon: Facebook, url: settings.facebookUrl, color: 'hover:text-blue-500', appUrl: settings.facebookUrl?.replace('www.facebook.com', 'fb://page') },
    { name: 'Instagram', icon: Instagram, url: settings.instagramUrl, color: 'hover:text-pink-500', appUrl: settings.instagramUrl?.replace('instagram.com', 'instagram://user?username=').replace('https://www.instagram.com/', '') },
    { name: 'TikTok', icon: Music, url: settings.tiktokUrl, color: 'hover:text-black', appUrl: settings.tiktokUrl?.replace('tiktok.com', 'tiktok://user') },
    { name: 'WhatsApp', icon: MessageCircle, url: settings.whatsappUrl, color: 'hover:text-green-500', appUrl: settings.whatsappUrl },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-md p-0 rounded-lg border-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="font-headline">Contacto</DialogTitle>
          <DialogDescription>
            Sigue nuestras redes sociales y contáctanos para estar al día con las últimas novedades.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 flex justify-center items-center space-x-4">
          {socialMedia.map((social) => {
            const Icon = social.icon;
            return social.url ? (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Try to open in app first, fallback to browser
                  if (social.appUrl && social.appUrl !== social.url) {
                    e.preventDefault();
                    // Create a temporary link to try opening the app
                    const appLink = document.createElement('a');
                    appLink.href = social.appUrl;
                    appLink.style.display = 'none';
                    document.body.appendChild(appLink);
                    appLink.click();
                    document.body.removeChild(appLink);

                    // Fallback to browser after a short delay
                    setTimeout(() => {
                      window.open(social.url, '_blank', 'noopener,noreferrer');
                    }, 500);
                  }
                  setIsOpen(false);
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full ${social.color} transition-all duration-200`}
                >
                  <Icon className="h-6 w-6" />
                </Button>
              </a>
            ) : null;
          })}
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              onClick={() => setIsOpen(false)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:text-green-500 transition-all duration-200"
              >
                <Mail className="h-6 w-6" />
              </Button>
            </a>
          )}
        </div>
        {socialMedia.every(social => !social.url) && !settings.contactEmail && (
            <p className="pb-4 text-center text-muted-foreground">
              No hay redes sociales ni correo configurados aún.
            </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
