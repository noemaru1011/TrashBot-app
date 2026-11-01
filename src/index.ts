import { Hono } from 'hono';

import { onError } from '@/errors/onError';
import { lineSignatureMiddleware } from '@/middleware/line-signature';
import lineRoute from '@/routes/line';

const APP = new Hono();

APP.use('/api/line/*', lineSignatureMiddleware);

APP.route('/api/line', lineRoute);

APP.onError(onError);

export default APP;