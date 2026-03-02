
'use server';
/**
 * @fileOverview A flow to securely fetch podcast audio from Firebase Storage.
 *
 * - getPodcastAudio - A function that fetches an audio file and returns it as a Data URI.
 * - PodcastAudioInput - The input type for the getPodcastAudio function.
 * - PodcastAudioOutput - The return type for the getPodcastAudio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App;

// Helper function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    if (getApps().length) {
        return getApps()[0];
    }
    try {
        // Construct the path to the service account file relative to the project root
        const serviceAccountPath = path.join(process.cwd(), 'scripts', 'luni-site-res01-firebase-adminsdk.json');
        
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: 'luni-site-res01.appspot.com',
            });
        } else {
            console.error(`Service account key not found at ${serviceAccountPath}. Podcast flow will be disabled.`);
            throw new Error('Service account key not found.');
        }
    } catch (e) {
        console.error("Failed to parse or initialize Firebase Admin SDK:", e);
        throw new Error('Could not initialize Firebase Admin SDK.');
    }
}

try {
    adminApp = initializeFirebaseAdmin();
} catch (error) {
    console.error("Initialization failed:", (error as Error).message);
    // adminApp will be uninitialized, and subsequent calls will fail gracefully.
}

const PodcastAudioInputSchema = z.object({
  fileName: z.string().min(1, "fileName es obligatorio.").describe('The name of the audio file in the "podcasts/" directory of Firebase Storage.'),
});
export type PodcastAudioInput = z.infer<typeof PodcastAudioInputSchema>;

const PodcastAudioOutputSchema = z.object({
  audioDataUri: z.string().describe("The audio file encoded as a Base64 Data URI."),
});
export type PodcastAudioOutput = z.infer<typeof PodcastAudioOutputSchema>;

export async function getPodcastAudio(input: PodcastAudioInput): Promise<PodcastAudioOutput> {
    if (!input || !input.fileName) {
        throw new Error("El argumento 'fileName' es requerido para obtener el audio del podcast.");
    }
    return getPodcastAudioFlow(input);
}

const getMimeType = (fileName: string): string => {
    const extension = path.extname(fileName).toLowerCase();
    switch (extension) {
        case '.mp3': return 'audio/mpeg';
        case '.wav': return 'audio/wav';
        case '.ogg': return 'audio/ogg';
        case '.m4a': return 'audio/mp4';
        default: return 'application/octet-stream';
    }
}

const getPodcastAudioFlow = ai.defineFlow(
  {
    name: 'getPodcastAudioFlow',
    inputSchema: PodcastAudioInputSchema,
    outputSchema: PodcastAudioOutputSchema,
  },
  async ({ fileName }) => {
    if (!adminApp) {
        throw new Error('Firebase Admin SDK not initialized. Cannot fetch podcast audio.');
    }
    try {
        const bucket = getStorage(adminApp).bucket();
        const file = bucket.file(`podcasts/${fileName}`);

        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File not found: podcasts/${fileName}`);
        }
        
        const [buffer] = await file.download();
        const audioBase64 = buffer.toString('base64');
        const mimeType = getMimeType(fileName);
        const audioDataUri = `data:${mimeType};base64,${audioBase64}`;

        return { audioDataUri };

    } catch (error: any) {
        console.error('Error fetching podcast audio from Firebase Storage:', error);
        throw new Error('Failed to retrieve podcast audio.');
    }
  }
);
