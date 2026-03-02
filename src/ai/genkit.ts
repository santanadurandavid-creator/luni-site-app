import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.gemini_api_key,
    })
  ],
  model: 'googleai/gemini-2.5-flash',
});
