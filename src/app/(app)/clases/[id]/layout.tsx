import { Metadata } from 'next';
import { getFirebaseServices } from '@/lib/firebase-server';
import { doc, getDoc } from 'firebase/firestore';

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    try {
        const { db } = getFirebaseServices();
        const claseRef = doc(db, 'content', id);
        const claseSnap = await getDoc(claseRef);

        if (!claseSnap.exists()) {
            return {
                title: 'Clase no encontrada | Luni Site',
                description: 'La clase que buscas no está disponible.',
            };
        }

        const clase = claseSnap.data();
        const title = clase.title || 'Clase Educativa';
        const type = clase.type || 'video';

        // Customize description based on content type
        let typeLabel = 'Video';
        if (type === 'podcast') typeLabel = 'Podcast';
        if (type === 'class') typeLabel = 'Clase en vivo';

        const description = clase.description || clase.subject || `${typeLabel} educativo para preparación UNAM`;
        const imageUrl = clase.imageUrl || clase.classDetails?.professorAvatar || '/images/luni-logo.png';
        const claseUrl = `https://luni.site/clases/${id}`;

        // Add additional info for live classes
        let enhancedDescription = description;
        if (type === 'class' && clase.classDetails) {
            const professor = clase.classDetails.professorName;
            const day = clase.classDetails.classDay;
            const time = clase.classDetails.classTime;

            if (professor) {
                enhancedDescription = `${description} - Impartida por ${professor}`;
            }
            if (day && time) {
                enhancedDescription += ` - ${day} a las ${time}`;
            }
        }

        return {
            title: `${title} | Luni Site`,
            description: enhancedDescription,
            openGraph: {
                title: title,
                description: enhancedDescription,
                url: claseUrl,
                siteName: 'Luni Site',
                images: [
                    {
                        url: imageUrl,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
                locale: 'es_MX',
                type: type === 'class' ? 'video.other' : 'video.movie',
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: enhancedDescription,
                images: [imageUrl],
            },
        };
    } catch (error) {
        console.error('Error generating metadata for clase:', error);
        return {
            title: 'Contenido Educativo | Luni Site',
            description: 'Videos, podcasts y clases en vivo para preparación UNAM',
        };
    }
}

export default function ClaseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
