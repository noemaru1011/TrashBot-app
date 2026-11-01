import type { webhook } from '@line/bot-sdk';
import { Hono } from 'hono';
import { processMessage } from '@/features/line/process-message';

//context定義
const app = new Hono<{
	Bindings: Env;
	Variables: {
		lineBody: string;
	};
}>();

app.post('/webhook', async (c) => {
	const body = JSON.parse(c.get('lineBody')) as webhook.CallbackRequest;

	//テキストメッセージで、テキストとreplyTokenが存在するイベントだけ処理する
	for (const event of body.events) {
		if (
			event.type !== 'message' ||
			event.message?.type !== 'text' ||
			!event.message.text ||
			!event.replyToken
		) {
			continue;
		}

		//非同期処理を開始する 200番をすぐに返す
		c.executionCtx.waitUntil(processMessage(event.message.text, event.replyToken, c.env));
	}
	return c.text('OK');
});

export default app;
