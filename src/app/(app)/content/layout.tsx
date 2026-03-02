import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contenido Educativo - Preparación UNAM | Luni Site',
  description: 'Accede a contenido de texto, podcasts y videos para prepararte para el examen de admisión de la UNAM. Material educativo completo y actualizado.',
  keywords: 'contenido UNAM, texto educativo, podcasts estudio, videos preparación, material UNAM, estudio admisión',
  openGraph: {
    title: 'Contenido Educativo - Preparación UNAM | Luni Site',
    description: 'Accede a contenido de texto, podcasts y videos para prepararte para el examen de admisión de la UNAM.',
    url: 'https://luni.site/content',
    siteName: 'Luni Site',
    type: 'website',
    images: [
      {
        url: 'https://luni.site/images/share-preview.png',
        width: 1200,
        height: 630,
        alt: 'Luni - Preparación UNAM',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contenido Educativo - Preparación UNAM | Luni Site',
    description: 'Accede a contenido de texto, podcasts y videos para prepararte para el examen de admisión de la UNAM.',
    images: ['https://luni.site/images/share-preview.png'],
  },
};

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
