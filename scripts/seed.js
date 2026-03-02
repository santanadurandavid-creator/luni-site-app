
// This script is for seeding your Firestore database with initial data.
// To run it, you need to:
// 1. Install Node.js on your machine.
// 2. Set up Firebase Admin SDK: `npm install firebase-admin`.
// 3. Get your service account key from Firebase Console > Project Settings > Service accounts.
//    Download the JSON file and place it in the `scripts` directory.
// 4. Update the path to your service account key in the `serviceAccount` require path below.
// 5. Run the script from your terminal: `node scripts/seed.js`

const admin = require('firebase-admin');

// IMPORTANT: Replace with the path to your service account key file.
const serviceAccount = require('./luni-site-res01-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const mockData = {
    content: [
        { id: 'video-matemáticas-1', title: 'Introducción a Matemáticas - Parte 1', subject: 'Matemáticas', views: 1200, imageUrl: 'https://placehold.co/400x225.png', category: 'Area 1 - Ciencias Físico-Matemáticas y de las Ingenierías', type: 'video', contentUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'video-física-1', title: 'Introducción a Física - Parte 1', subject: 'Física', views: 800, imageUrl: 'https://placehold.co/400x225.png', category: 'Area 1 - Ciencias Físico-Matemáticas y de las Ingenierías', type: 'video', contentUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'content-historia-1', title: 'Introducción a Historia - Parte 1', subject: 'Historia', views: 500, imageUrl: 'https://placehold.co/400x225.png', category: 'Area 2 - Ciencias Biológicas, Químicas y de la Salud', type: 'content', contentUrl: 'https://www.lipsum.com/' },
        { id: 'quiz-razonamiento-1', title: 'Quiz de Razonamiento Matemático', subject: 'Razonamiento Matemático', views: 2500, imageUrl: 'https://placehold.co/400x225.png', category: 'Area 1 - Ciencias Físico-Matemáticas y de las Ingenierías', type: 'quiz', contentUrl: 'https://www.lipsum.com/' },
    ],
    announcements: [
        { title: '¡Nueva sección de Quizzes interactivos!', description: 'Hemos lanzado una nueva sección de quizzes para que puedas poner a prueba tus conocimientos.', date: '2024-05-20', imageUrl: 'https://placehold.co/600x400.png', contentUrl: 'https://example.com', createdAt: new Date() },
        { title: 'Ampliamos nuestra Videoteca de Física', description: 'Agregamos más de 20 nuevos videos sobre temas avanzados de física.', date: '2024-05-15', imageUrl: 'https://placehold.co/600x400.png', contentUrl: 'https://example.com', createdAt: new Date() }
    ],
    exams: [
        {
            id: 'general-v1',
            name: 'Examen General v1.0',
            area: 'Todas las Áreas',
            type: "Examen de Ingreso a la Universidad (General)",
            questions: Array.from({ length: 10 }, (_, i) => ({
              id: `g1-q-${i + 1}`,
              question: `Pregunta General V1 - N° ${i + 1}. ¿Cuál es la respuesta?`,
              options: [`Opción A`, `Opción B`, `Opción C`, `Opción D`],
              answer: `Opción A`,
            }))
        },
        {
            id: 'med-v1',
            name: 'Examen Medicina v1.0',
            area: 'Ciencias Biológicas y de la Salud',
            type: "Examen de Medicina",
            questions: Array.from({ length: 10 }, (_, i) => ({
              id: `m1-q-${i + 1}`,
              question: `Pregunta Medicina V1 - N° ${i + 1}. ¿Cuál es la respuesta?`,
              options: [`Opción A`, `Opción B`, `Opción C`, `Opción D`],
              answer: `Opción A`,
            }))
        }
    ]
};

async function seedCollection(collectionName, data) {  
  const collectionRef = db.collection(collectionName);
  const batch = db.batch();

  data.forEach(item => {
    const docRef = item.id ? collectionRef.doc(item.id) : collectionRef.doc();
    batch.set(docRef, item);
  });

  await batch.commit();
  console.log(`Seeded ${data.length} documents in ${collectionName}`);
}

async function seedAll() {
    console.log('Starting to seed database...');
    await seedCollection('content', mockData.content);
    await seedCollection('announcements', mockData.announcements);
    await seedCollection('exams', mockData.exams);
    console.log('Database seeding completed successfully!');
}

seedAll().catch(console.error);
