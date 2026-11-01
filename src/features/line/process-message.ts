import { AppError } from '@/errors/app-error';
import { askGemini } from '@/lib/gemini/ask';
import { replyToLine } from './reply';

export async function processMessage(message: string, replyToken: string, env: Env): Promise<void> {
	try {
		const answer = await askGemini(message, env);

		//Geminiから回答が返ってきたら、その回答をLINE Reply APIへ
		await replyToLine(replyToken, answer, env.LINE_CHANNEL_ACCESS_TOKEN);
	} catch (error) {
		//例外が起きた時、タイトルを返す（detail入れない)
		if (error instanceof AppError) {
			await replyToLine(replyToken, error.problem.title, env.LINE_CHANNEL_ACCESS_TOKEN);

			return;
		}
		//AppErrorではないとき
		await replyToLine(replyToken, 'システムエラーが発生しました。', env.LINE_CHANNEL_ACCESS_TOKEN);
	}
}
