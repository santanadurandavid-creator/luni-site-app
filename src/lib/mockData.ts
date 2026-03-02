
import type { User, ContentItem, Exam, UpdateInfo, SupportTicket } from './types';

export const mockUsers: User[] = [
    {
        id: 'user-1',
        name: 'Estudiante Ejemplo',
        email: 'estudiante@example.com',
        avatar: 'https://api.multiavatar.com/estudiante.png',
        examType: 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías',
        studyTime: { 'Matemáticas': 3600, 'Física': 1800 },
        role: 'normal',
        examResults: [
            {
                id: 'res1',
                userId: 'user-1',
                resultId: 'res1',
                examId: 'general-v1',
                examName: 'Examen General v1.0',
                score: 85,
                correctAnswers: 85,
                totalQuestions: 100,
                completedAt: new Date(),
                answers: [],
                timeTaken: 7200,
            }
        ]
    },
    {
        id: 'admin-1',
        name: 'Admin Luni',
        email: 'admin@example.com',
        avatar: 'https://api.multiavatar.com/admin.png',
        examType: null,
        studyTime: {},
        role: 'admin',
        isAdmin: true,
    },
    {
        id: 'support-1',
        name: 'Soporte Luni',
        email: 'support@example.com',
        avatar: 'https://api.multiavatar.com/support.png',
        examType: null,
        studyTime: {},
        role: 'support',
    },
];

export const mockContentItems: ContentItem[] = [
    { id: 'video-matematicas-1', title: 'Introducción a Matemáticas', subject: 'Matemáticas', imageUrl: 'https://picsum.photos/400/225', category: 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', type: 'video', contentUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', accessLevel: 'free', interactiveContent: { splashTitle: 'Introducción a Matemáticas', splashBackgroundImageUrl: '', explanatory: { title: 'Explicación', htmlContent: '<div><p>Contenido explicativo</p></div>' } } },
    { id: 'video-fisica-1', title: 'Introducción a Física', subject: 'Física', imageUrl: 'https://picsum.photos/400/225', category: 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', type: 'video', contentUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', accessLevel: 'free', interactiveContent: { splashTitle: 'Introducción a Física', splashBackgroundImageUrl: '', explanatory: { title: 'Explicación', htmlContent: '<div><p>Contenido explicativo</p></div>' } } },
    { id: 'content-historia-1', title: 'Introducción a Historia', subject: 'Historia', imageUrl: 'https://picsum.photos/400/225', category: 'Área 2: Ciencias Biológicas, Químicas y de la Salud', type: 'content', contentUrl: 'https://www.lipsum.com/', accessLevel: 'free', interactiveContent: { splashTitle: 'Introducción a Historia', splashBackgroundImageUrl: '', explanatory: { title: 'Explicación', htmlContent: '<div><p>Contenido explicativo</p></div>' } } },
    { id: 'quiz-razonamiento-1', title: 'Quiz de Razonamiento Matemático', subject: 'Razonamiento Matemático', imageUrl: 'https://picsum.photos/400/225', category: 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', type: 'quiz', accessLevel: 'free', interactiveContent: { splashTitle: 'Quiz de Razonamiento Matemático', splashBackgroundImageUrl: '', explanatory: { title: 'Explicación', htmlContent: '<div><p>Contenido explicativo</p></div>' } } },
];

export const mockExams: Exam[] = [
    {
        id: 'general-v1',
        title: 'Examen General v1.0',
        name: 'Examen General v1.0',
        area: 'Todas las Áreas',
        type: "Examen de Ingreso a la Universidad (General)",
        questions: Array.from({ length: 10 }, (_, i) => ({
            id: `g1-q-${i + 1}`,
            question: `Pregunta General V1 - N° ${i + 1}. ¿Cuál es la respuesta?`,
            options: [{ text: 'Opción A', isCorrect: true }, { text: 'Opción B', isCorrect: false }, { text: 'Opción C', isCorrect: false }, { text: 'Opción D', isCorrect: false }],
            answer: `Opción A`,
        }))
    },
    {
        id: 'med-v1',
        title: 'Examen Medicina v1.0',
        name: 'Examen Medicina v1.0',
        area: 'Ciencias Biológicas y de la Salud',
        type: "Examen de Medicina",
        questions: Array.from({ length: 10 }, (_, i) => ({
            id: `m1-q-${i + 1}`,
            question: `Pregunta Medicina V1 - N° ${i + 1}. ¿Cuál es la respuesta?`,
            options: [{ text: 'Opción A', isCorrect: true }, { text: 'Opción B', isCorrect: false }, { text: 'Opción C', isCorrect: false }, { text: 'Opción D', isCorrect: false }],
            answer: `Opción A`,
        }))
    }
];

export const mockAnnouncements: UpdateInfo[] = [
    { id: '1', title: '¡Nueva sección de Quizzes interactivos!', content: 'Hemos lanzado una nueva sección de quizzes para que puedas poner a prueba tus conocimientos.', description: 'Hemos lanzado una nueva sección de quizzes para que puedas poner a prueba tus conocimientos.', date: '2024-05-20', imageUrl: 'https://picsum.photos/600/400', contentType: 'url', contentUrl: 'https://example.com', createdAt: new Date() },
    { id: '2', title: 'Ampliamos nuestra Videoteca de Física', content: 'Agregamos más de 20 nuevos videos sobre temas avanzados de física.', description: 'Agregamos más de 20 nuevos videos sobre temas avanzados de física.', date: '2024-05-15', imageUrl: 'https://picsum.photos/600/400', contentType: 'url', contentUrl: 'https://example.com', createdAt: new Date() }
];

export const mockSupportTickets: SupportTicket[] = [
    {
        id: 'ticket-1',
        userId: 'user-1',
        subject: 'Problema con mi pago',
        status: 'open',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: 'Hola, no veo mis tokens reflejados.',
        messages: [
            { id: 'msg-1', senderId: 'user-1', text: 'Hola, no veo mis tokens reflejados.', createdAt: new Date() }
        ]
    }
];
