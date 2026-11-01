import { AppError } from '@/errors/app-error';
import { getTodayJst } from '@/lib/date';
import { createGeminiClient } from './client';
import { executeTool, getToolDeclarations } from './tool-runner';

type ToolArgs = Record<string, string>;

type GeminiContent = {
	role: 'user' | 'model';
	parts: Array<Record<string, unknown>>;
};
const MAX_ITERATIONS = 10;

export async function askGemini(message: string, env: Env): Promise<string> {
	const ai = createGeminiClient(env);

	const today = getTodayJst();

	const contents: GeminiContent[] = [
		{
			role: 'user',
			parts: [
				{
					text: `
現在の日付: ${today}

ユーザーのメッセージ:
${message}
				`.trim(),
				},
			],
		},
	];

	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const response = await ai.models.generateContent({
			model: 'gemini-3.5-flash-lite',
			contents,
			config: {
				tools: [
					{
						functionDeclarations: getToolDeclarations(),
					},
				],
			},
		});
		if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
			throw new AppError({
				type: 'gemini/max-tokens',
				title: 'AIの回答生成に必要なトークン数が上限に達しました',
				status: 500,
				detail: 'Gemini response reached the maximum token limit.',
			});
		}
		if (!response.functionCalls?.length) {
			// Toolを使わなかった場合は、そのまま最終回答として返す
			return response.text ?? '';
		}

		const modelContent = response.candidates?.[0]?.content;

		if (!modelContent) {
			throw new AppError({
				type: 'gemini/response-content-missing',
				title: 'Geminiからの回答を取得できませんでした',
				status: 500,
				detail: 'Gemini response content is missing.',
			});
		}

		if (!modelContent.parts) {
			throw new AppError({
				type: 'gemini/response-parts-missing',
				title: 'Geminiからの回答を取得できませんでした',
				status: 500,
				detail: 'Gemini response parts are missing.',
			});
		}

		// GeminiがToolを呼び出したという履歴を追加
		contents.push({
			role: 'model',
			parts: modelContent.parts.map((part) => part as Record<string, unknown>),
		});

		// Geminiが要求したToolを実行
		for (const functionCall of response.functionCalls) {
			if (!functionCall.name) {
				throw new AppError({
					type: 'gemini/function-call-name-missing',
					title: 'Geminiの処理に失敗しました',
					status: 500,
					detail: 'Gemini function call name is missing.',
				});
			}

			const result = await executeTool(
				functionCall.name,
				(functionCall.args ?? {}) as ToolArgs,
				env,
			);

			// Toolの実行結果をGeminiへ返す
			contents.push({
				role: 'user',
				parts: [
					{
						functionResponse: {
							name: functionCall.name,
							response: {
								result,
							},
							...(functionCall.id
								? {
									id: functionCall.id,
								}
								: {}),
						},
					},
				],
			});
		}
	}
	// 上限到達
	throw new AppError({
		type: 'gemini/max-tool-calls',
		title: 'AIの処理回数が上限に達しました',
		status: 500,
		detail: `Gemini tool call loop exceeded the maximum of ${MAX_ITERATIONS} iterations.`,
	});
}
