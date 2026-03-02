'use client';

import React, { createContext, useContext, ReactNode } from 'react';

type Language = 'es';

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Traducciones en español
const translations = {
  es: {
    'startExam': 'Comenzar Examen',
    'finishExam': 'Finalizar Examen',
    'next': 'Siguiente',
    'previous': 'Anterior',
    'exit': 'Salir',
    'confirm': 'Confirmar',
    'cancel': 'Cancelar',
    'language': 'Idioma',
    'spanish': 'Español',
    'english': 'Inglés',
    'selectLanguage': 'Seleccionar Idioma',
    'close': 'Cerrar',
    'editProfile': 'Editar Perfil',
    'changeArea': 'Cambiar Área',
    'rateLuni': 'Calificar a Luni',
    'helpSupport': 'Ayuda y Soporte',
    'termsConditions': 'Términos y Condiciones',
    'contact': 'Contacto',
    'installApp': 'Instalar App',
    'theme': 'Tema',
    'light': 'Claro',
    'dark': 'Oscuro',
    'system': 'Sistema',
    'logout': 'Cerrar sesión',
    'instructions': 'Instrucciones del Examen',
    'examStarted': 'Estás a punto de comenzar tu examen de simulación.',
    'duration': 'Duración: 3 horas',
    'timeRunning': 'El tiempo comenzará a correr en cuanto presiones "Comenzar Examen".',
    'attention': '¡Atención!',
    'noExit': 'Una vez iniciado, no podrás salir de la pestaña del examen. Si lo haces, tu progreso podría perderse.',
    'sureExit': '¿Seguro que quieres salir?',
    'progressLost': 'Tu progreso se perderá y el token de examen no será reembolsado.',
    'writeExit': 'Para confirmar, escribe "Salir" a continuación.',
    'confirmExit': 'Confirmar y Salir',
    'question': 'Pregunta',
    'of': 'de',
    'subject': 'Materia',
    'withoutSubject': 'Sin materia',
    'sureFinish': '¿Estás seguro?',
    'noChange': 'Una vez que finalices, no podrás cambiar tus respuestas.',
    'confirmFinish': 'Confirmar y Finalizar',
    'examFinished': '¡Examen Finalizado!',
    'yourScore': 'Tu calificación es:',
    'backProfile': 'Volver al Perfil',
    'home': 'Inicio',
    'classes': 'Clases',
    'content': 'Contenido',
    'quizzes': 'Quizzes',
    'updates': 'Novedades',
    'adminPanel': 'Panel de administración',
    'playPodcast': 'Reproducir podcast',
    'selectExam': 'Seleccionar un examen',
    'examLimitReached': 'Límite de exámenes alcanzado',
    'confirmExamStart': '¿Confirmar inicio del examen?',
    'examStartDescription': 'Esto contará como uno de tus exámenes disponibles. Una vez iniciado, el temporizador comenzará. ¿Estás listo?',
    'confirmAndStart': 'Confirmar e Iniciar',
    'examsRemaining': 'Exámenes restantes',
    'studyTime': 'Tiempo de Estudio',
    'totalTimeSpent': 'Total de tiempo invertido',
    'novato': 'Novato',
    'intermedio': 'Intermedio',
    'avanzado': 'Avanzado',
    'legendario': 'Legendario',
    'ultrainstinto': 'Ultra Instinto',
    'sayajin': 'Sayajin',
    'quizzesCompleted': 'Quizzes Completados',
    'totalQuizzesCompleted': 'Total de quizzes realizados',
    'studyDistribution': 'Distribución de Estudio',
    'noStudyTimeRecorded': 'Aún no has registrado tiempo de estudio.',
    'startStudying': '¡Empieza a estudiar para ver tus estadísticas!',
    'studyTimeBySubject': 'Tiempo de estudio por materia (en minutos).',
    'active': 'Activos',
    'archived': 'Archivados',
    'noResultsInSection': 'No hay resultados en esta sección.',
    'noExamsCompleted': 'Aún no has completado ningún examen.',
    'startPracticing': '¡Usa un token para comenzar a practicar!',
    'unarchive': 'Desarchivar',
    'archive': 'Archivar',
    'delete': 'Eliminar',
    'areYouSureDelete': '¿Estás seguro de que quieres eliminar?',
    'permanentAction': 'Esta acción es permanente y no se puede deshacer. Para confirmar, escribe',
    'deleteBelow': 'eliminar',
    'confirmDelete': 'Confirmar y Eliminar',
    'invalidDate': 'Fecha inválida',
    'clickToSeeDetails': 'Haz clic para ver detalles',
    'correctAnswers': 'correctas',
    'recentResults': 'Resultados Recientes',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language: Language = 'es';

  const t = (key: string): string => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
