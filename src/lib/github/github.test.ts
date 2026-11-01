import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/errors/app-error';
import { mockEnv } from '@/test/mocks/env';
import { getDataFile, upsertDataFile } from './github';

describe('GitHub Data File Integration Tests', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('getDataFile', () => {
		it('GitHubから取得したBase64データをUTF-8文字列にデコードして返すこと', async () => {
			// 改行を含むBase64データ
			const mockBase64Content = '44GT44KT44Gr44Gh44Gv44CB5LiW55WM77yBIPCfmIo=\n';

			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					content: mockBase64Content,
					encoding: 'base64',
					sha: 'mock-sha-123',
				}),
			};

			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

			const result = await getDataFile('test.txt', mockEnv);

			expect(result).toBe('こんにちは、世界！ 😊');

			expect(fetchSpy).toHaveBeenCalledWith(
				'https://api.github.com/repos/test-owner/test-repository/contents/data/test.txt',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token',
					}),
				}),
			);
		});

		it('APIがエラーを返した場合にAppErrorをスローすること', async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

			await expect(getDataFile('not-found.txt', mockEnv)).rejects.toThrow(AppError);
		});
	});

	describe('upsertDataFile', () => {
		it('新規作成時にSHAなしでBase64エンコードしてPUTリクエストを送ること', async () => {
			// 既存ファイルの取得 -> 404
			const mockGetRes = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
			};

			// ファイル作成 -> 201
			const mockPutRes = {
				ok: true,
				status: 201,
			};

			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(mockGetRes as Response)
				.mockResolvedValueOnce(mockPutRes as Response);

			await upsertDataFile('new.txt', 'こんにちは、世界！ 😊', mockEnv);

			expect(fetchSpy).toHaveBeenCalledTimes(2);

			const putBody = JSON.parse(fetchSpy.mock.calls[1][1]?.body as string);

			// Base64エンコードされた内容が正しいこと
			expect(putBody.content).toBe('44GT44KT44Gr44Gh44Gv44CB5LiW55WM77yBIPCfmIo=');

			// 新規作成なのでSHAは送信しない
			expect(putBody.sha).toBeUndefined();
		});

		it('既存ファイルの更新時に取得したSHAをPUTリクエストへ引き継ぐこと', async () => {
			// 既存ファイルの取得 -> 200
			const mockGetRes = {
				ok: true,
				status: 200,
				json: async () => ({
					content: 'YmFzZTY0',
					encoding: 'base64',
					sha: 'existing-sha-999',
				}),
			};

			// ファイル更新 -> 200
			const mockPutRes = {
				ok: true,
				status: 200,
			};

			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(mockGetRes as Response)
				.mockResolvedValueOnce(mockPutRes as Response);

			await upsertDataFile('existing.txt', 'update content', mockEnv);

			expect(fetchSpy).toHaveBeenCalledTimes(2);

			const putBody = JSON.parse(fetchSpy.mock.calls[1][1]?.body as string);

			expect(putBody.sha).toBe('existing-sha-999');
		});
	});
});
