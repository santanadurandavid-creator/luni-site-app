import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import StructuredData from "@/components/StructuredData";
import AdManager from "@/components/ads/AdManager";
import { cn } from "@/lib/utils";
import { PlanGenerationProvider } from '@/contexts/PlanGenerationContext';
import { CacheWarmer } from '@/components/layout/CacheWarmer';
import { GlobalAudioPlayer } from '@/components/layout/GlobalAudioPlayer';

export const metadata: Metadata = {
  title: 'Luni Site - Preparación para Examen de Admisión UNAM',
  description: 'Plataforma inteligente para preparar tu examen de admisión UNAM con quizzes, videos y contenido especializado.',
  keywords: 'UNAM, examen admisión, preparación universitaria, quizzes simuladores, contenido educativo, estudio en línea',
  authors: [{ name: 'Luni Site' }],
  metadataBase: new URL('https://luni.site/'), // Base URL to generate absolute URLs for OG images
  openGraph: {
    title: 'Luni Site - Preparación UNAM',
    description: 'La mejor plataforma para prepararte para el examen de la UNAM.',
    url: 'https://luni.site/',
    siteName: 'Luni Site',
    images: [
      {
        url: 'https://luni.site/images/share-preview.png', // Explicit absolute URL
        width: 1200,
        height: 630,
        alt: 'Luni - Preparación UNAM',
        type: 'image/png',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luni Site - Preparación UNAM',
    description: 'Plataforma inteligente para preparar tu examen de admisión UNAM.',
    images: ['https://luni.site/images/share-preview.png'],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#3e4b5b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              <PlanGenerationProvider>
                <StructuredData />
                <CacheWarmer />
                {children}
                <Toaster />
                <GlobalAudioPlayer />
              </PlanGenerationProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
