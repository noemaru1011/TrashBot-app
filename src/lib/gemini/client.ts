import { GoogleGenAI } from '@google/genai';

export function createGeminiClient(env: Env) {
	return new GoogleGenAI({
		apiKey: env.GEMINI_API_KEY,
	});
}
