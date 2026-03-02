import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quizzes y Simuladores - Preparación Examen UNAM | Luni Site',
  description: 'Practica con quizzes simuladores y banco de preguntas para el examen de admisión de la UNAM. Mejora tus habilidades con evaluaciones interactivas.',
  keywords: 'quizzes UNAM, simuladores examen, banco preguntas, práctica admisión, evaluaciones UNAM, preparación quizzes',
  openGraph: {
    title: 'Quizzes y Simuladores - Preparación Examen UNAM | Luni Site',
    description: 'Practica con quizzes simuladores y banco de preguntas para el examen de admisión de la UNAM.',
    url: 'https://luni.site/quizzes',
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
    title: 'Quizzes y Simuladores - Preparación Examen UNAM | Luni Site',
    description: 'Practica con quizzes simuladores y banco de preguntas para el examen de admisión de la UNAM.',
    images: ['https://luni.site/images/share-preview.png'],
  },
};

export default function QuizzesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
