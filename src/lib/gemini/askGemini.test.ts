
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTodayJst } from '@/lib/date';
import { askGemini } from './ask';
import { createGeminiClient } from './client';
import { executeTool, getToolDeclarations } from './tool-runner';

vi.mock('./client', () => ({
	createGeminiClient: vi.fn(),
}));

vi.mock('./tool-runner', () => ({
	executeTool: vi.fn(),
	getToolDeclarations: vi.fn(),
}));

vi.mock('@/lib/date', () => ({
	getTodayJst: vi.fn(),
}));

describe('askGemini', () => {
	const generateContent = vi.fn();

	const env = {
		GEMINI_API_KEY: 'test-api-key',
	} as Env;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(createGeminiClient).mockReturnValue({
			models: {
				generateContent,
			},
		} as never);

		vi.mocked(getTodayJst).mockReturnValue('2026-08-22');
		vi.mocked(getToolDeclarations).mockReturnValue([]);
	});

	it('Toolを使わずにGeminiが回答した場合、その回答を返す', async () => {
		generateContent.mockResolvedValue({
			text: 'こんにちは',
			candidates: [
				{
					finishReason: 'STOP',
				},
			],
			functionCalls: [],
		});

		const result = await askGemini('こんにちは', env);

		expect(result).toBe('こんにちは');
		expect(generateContent).toHaveBeenCalledTimes(1);
	});

	it('現在の日付とユーザーメッセージをGeminiに渡す', async () => {
		generateContent.mockResolvedValue({
			text: '回答',
			functionCalls: [],
		});

		await askGemini('明日のゴミは？', env);

		expect(generateContent).toHaveBeenCalledWith({
			model: 'gemini-3.5-flash-lite',
			contents: [
				{
					role: 'user',
					parts: [
						{
							text: `現在の日付: 2026-08-22

ユーザーのメッセージ:
明日のゴミは？`,
						},
					],
				},
			],
			config: {
				tools: [
					{
						functionDeclarations: [],
					},
				],
			},
		});
	});

	it('Toolを実行した場合、結果をGeminiに渡して最終回答を返す', async () => {
		generateContent
			.mockResolvedValueOnce({
				candidates: [
					{
						finishReason: 'STOP',
						content: {
							parts: [
								{
									functionCall: {
										name: 'trash_get_tomorrow',
									},
								},
							],
						},
					},
				],
				functionCalls: [
					{
						name: 'trash_get_tomorrow',
						args: {},
						id: 'call-1',
					},
				],
			})
			.mockResolvedValueOnce({
				text: '明日は燃えるゴミです。',
				functionCalls: [],
			});

		vi.mocked(executeTool).mockResolvedValue('燃えるゴミ');

		const result = await askGemini('明日は何ゴミ？', env);

		expect(result).toBe('明日は燃えるゴミです。');
		expect(executeTool).toHaveBeenCalledWith(
			'trash_get_tomorrow',
			{},
			env,
		);
		expect(generateContent).toHaveBeenCalledTimes(2);

		expect(generateContent).toHaveBeenLastCalledWith({
			model: 'gemini-3.5-flash-lite',
			contents: [
				{
					role: 'user',
					parts: [
						{
							text: `現在の日付: 2026-08-22

ユーザーのメッセージ:
明日は何ゴミ？`,
						},
					],
				},
				{
					role: 'model',
					parts: [
						{
							functionCall: {
								name: 'trash_get_tomorrow',
							},
						},
					],
				},
				{
					role: 'user',
					parts: [
						{
							functionResponse: {
								name: 'trash_get_tomorrow',
								response: {
									result: '燃えるゴミ',
								},
								id: 'call-1',
							},
						},
					],
				},
			],
			config: {
				tools: [
					{
						functionDeclarations: [],
					},
				],
			},
		});
	});

	it('複数のToolを実行する', async () => {
		generateContent
			.mockResolvedValueOnce({
				candidates: [
					{
						content: {
							parts: [
								{
									functionCall: {
										name: 'tool-a',
									},
								},
								{
									functionCall: {
										name: 'tool-b',
									},
								},
							],
						},
					},
				],
				functionCalls: [
					{
						name: 'tool-a',
						args: {
							value: 'a',
						},
					},
					{
						name: 'tool-b',
						args: {
							value: 'b',
						},
					},
				],
			})
			.mockResolvedValueOnce({
				text: '回答',
				functionCalls: [],
			});

		vi.mocked(executeTool)
			.mockResolvedValueOnce('result-a')
			.mockResolvedValueOnce('result-b');

		const result = await askGemini('質問', env);

		expect(result).toBe('回答');
		expect(executeTool).toHaveBeenNthCalledWith(
			1,
			'tool-a',
			{ value: 'a' },
			env,
		);
		expect(executeTool).toHaveBeenNthCalledWith(
			2,
			'tool-b',
			{ value: 'b' },
			env,
		);
	});

	it('MAX_TOKENSの場合、AppErrorを投げる', async () => {
		generateContent.mockResolvedValue({
			candidates: [
				{
					finishReason: 'MAX_TOKENS',
				},
			],
		});

		await expect(askGemini('質問', env)).rejects.toMatchObject({
			problem: {
				type: 'gemini/max-tokens',
				title: 'AIの回答生成に必要なトークン数が上限に達しました',
				status: 500,
			},
		});
	});

	it('Tool呼び出しがあるがcontentがない場合、AppErrorを投げる', async () => {
		generateContent.mockResolvedValue({
			functionCalls: [
				{
					name: 'tool-a',
				},
			],
			candidates: [{}],
		});

		await expect(askGemini('質問', env)).rejects.toMatchObject({
			problem: {
				type: 'gemini/response-content-missing',
				title: 'Geminiからの回答を取得できませんでした',
				status: 500,
			},
		});
	});

	it('contentはあるがpartsがない場合、AppErrorを投げる', async () => {
		generateContent.mockResolvedValue({
			functionCalls: [
				{
					name: 'tool-a',
				},
			],
			candidates: [
				{
					content: {},
				},
			],
		});

		await expect(askGemini('質問', env)).rejects.toMatchObject({
			problem: {
				type: 'gemini/response-parts-missing',
				title: 'Geminiからの回答を取得できませんでした',
				status: 500,
			},
		});
	});

	it('Toolのnameがない場合、AppErrorを投げる', async () => {
		generateContent.mockResolvedValue({
			functionCalls: [
				{
					args: {},
				},
			],
			candidates: [
				{
					content: {
						parts: [],
					},
				},
			],
		});

		await expect(askGemini('質問', env)).rejects.toMatchObject({
			problem: {
				type: 'gemini/function-call-name-missing',
				title: 'Geminiの処理に失敗しました',
				status: 500,
			},
		});
	});
});
