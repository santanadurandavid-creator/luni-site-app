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
        const quizRef = doc(db, 'content', id);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
            return {
                title: 'Quiz no encontrado | Luni Site',
                description: 'El quiz que buscas no está disponible.',
            };
        }

        const quiz = quizSnap.data();
        const title = quiz.title || 'Quiz Educativo';
        const description = quiz.description || quiz.subject || 'Quiz interactivo para preparación UNAM';
        const imageUrl = quiz.imageUrl || '/images/luni-logo.png';
        const quizUrl = `https://luni.site/quizzes/${id}`;

        // Add question count to description if available
        const questionCount = quiz.quizDetails?.questions?.length;
        const enhancedDescription = questionCount
            ? `${description} - ${questionCount} preguntas`
            : description;

        return {
            title: `${title} | Luni Site`,
            description: enhancedDescription,
            openGraph: {
                title: title,
                description: enhancedDescription,
                url: quizUrl,
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
                description: enhancedDescription,
                images: [imageUrl],
            },
        };
    } catch (error) {
        console.error('Error generating metadata for quiz:', error);
        return {
            title: 'Quiz Educativo | Luni Site',
            description: 'Quiz interactivo para preparación UNAM',
        };
    }
}

export default function QuizLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
