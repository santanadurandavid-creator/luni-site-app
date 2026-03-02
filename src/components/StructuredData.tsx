'use client';
import { useEffect } from 'react';

const StructuredData = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "Luni Site",
      "description": "Plataforma completa para preparación del examen de admisión de la UNAM",
      "url": "https://luni-site.com",
      "logo": "https://luni-site.com/images/loginscreen.png",
      "sameAs": [
        "https://www.facebook.com/luni.site", // Replace with actual social media
        "https://www.instagram.com/luni.site",
        "https://twitter.com/luni_site"
      ],
      "offers": {
        "@type": "Offer",
        "category": "Education",
        "description": "Cursos y materiales para preparación de examen UNAM"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Cursos de Preparación UNAM",
        "itemListElement": [
          {
            "@type": "Course",
            "name": "Quizzes Simuladores UNAM",
            "description": "Practica con simuladores del examen de admisión",
            "provider": {
              "@type": "Organization",
              "name": "Luni Site"
            }
          },
          {
            "@type": "Course",
            "name": "Contenido Educativo UNAM",
            "description": "Material de texto, podcasts y videos para estudio",
            "provider": {
              "@type": "Organization",
              "name": "Luni Site"
            }
          }
        ]
      }
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

export default StructuredData;
