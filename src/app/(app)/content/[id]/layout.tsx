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
        const contentRef = doc(db, 'content', id);
        const contentSnap = await getDoc(contentRef);

        if (!contentSnap.exists()) {
            return {
                title: 'Contenido no encontrado | Luni Site',
                description: 'El contenido que buscas no está disponible.',
            };
        }

        const content = contentSnap.data();
        const title = content.title || 'Contenido Educativo';
        const description = content.description || content.subject || 'Material educativo para preparación UNAM';
        const imageUrl = content.imageUrl || '/images/luni-logo.png';
        const contentUrl = `https://luni.site/content/${id}`;

        return {
            title: `${title} | Luni Site`,
            description: description,
            openGraph: {
                title: title,
                description: description,
                url: contentUrl,
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
                type: 'article',
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description,
                images: [imageUrl],
            },
        };
    } catch (error) {
        console.error('Error generating metadata for content:', error);
        return {
            title: 'Contenido Educativo | Luni Site',
            description: 'Material educativo para preparación UNAM',
        };
    }
}

export default function ContentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
