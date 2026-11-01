import { AppError } from '@/errors/app-error';

export async function replyToLine(
	replyToken: string,
	text: string,
	channelAccessToken: string,
): Promise<void> {
	//LINE APIを呼び出しと呼び出すための認証あり
	const response = await fetch('https://api.line.me/v2/bot/message/reply', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${channelAccessToken}`,
			'Content-Type': 'application/json',
		},
		//この replyToken に対して、このテキストを返信
		body: JSON.stringify({
			replyToken,
			messages: [
				{
					type: 'text',
					text,
				},
			],
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text();

		throw new AppError({
			type: 'line/reply-failed',
			title: 'LINEへの返信に失敗しました',
			status: response.status,
			detail: errorBody,
		});
	}
}
