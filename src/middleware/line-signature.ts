import { createMiddleware } from 'hono/factory';
import { Base64 } from 'js-base64';
import { AppError } from '@/errors/app-error';

export const lineSignatureMiddleware = createMiddleware<{
	Bindings: Env;
	Variables: {
		lineBody: string;
	};
}>(async (c, next) => {
	//署名の存在確認
	const signature = c.req.header('x-line-signature');
	if (!signature) {
		throw new AppError({
			type: 'line/missing-signature',
			title: 'LINE署名がありません',
			status: 401,
			detail: 'x-line-signatureヘッダーがありません',
		});
	}

	const bodyText = await c.req.text();

	//正しい書名が確認
	const isValid = await verifyLineSignature(bodyText, signature, c.env.LINE_CHANNEL_SECRET);

	if (!isValid) {
		throw new AppError({
			type: 'line/invalid-signature',
			title: 'LINE署名が不正です',
			status: 401,
			detail: 'LINE署名の検証に失敗しました',
		});
	}

	c.set('lineBody', bodyText);

	await next();
});

async function verifyLineSignature(
	body: string,
	signature: string,
	channelSecret: string,
): Promise<boolean> {
	const encoder = new TextEncoder();

	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(channelSecret),
		{
			name: 'HMAC',
			hash: 'SHA-256',
		},
		false,
		['sign'],
	);

	const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

	const expectedSignature = Base64.fromUint8Array(new Uint8Array(signatureBuffer));

	//自分で計算したHMAC署名とLINEから送られてきた署名を比較(タイミング攻撃意識)
	return timingSafeEqual(expectedSignature, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;

	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}
