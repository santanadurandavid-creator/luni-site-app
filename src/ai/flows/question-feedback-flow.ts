'use server';
/**
 * @fileOverview Flow para generar feedback sobre una pregunta de examen específica.
 */

export async function getQuestionFeedback(input: {
  question: string;
  options: string;
  correctAnswer: string;
  userAnswer: string;
}): Promise<string> {
  // Placeholder implementation - return a basic feedback message
  return "Esta funcionalidad está temporalmente deshabilitada. Por favor, intenta de nuevo más tarde.";
}
