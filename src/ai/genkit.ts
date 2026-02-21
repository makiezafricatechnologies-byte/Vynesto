import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit instance configured for Google AI.
 * Defined on the server side to handle research flows.
 */
export const ai = genkit({
  plugins: [googleAI()],
});