import type { Context } from 'hono';
import { AppError } from '@/errors/app-error';

export const onError = (error: Error, c: Context) => {
    if (error instanceof AppError) {
        console.error({
            ...error.problem,
            instance: error.problem.instance ?? c.req.path,
        });
        // ラインでは200を返してメッセージが欲しいため
        return c.text('OK');
    }

    console.error({
        type: 'internal/server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: error.message,
        instance: c.req.path,
    });
    // ラインでは200を返してメッセージが欲しいため
    return c.text('OK');
};