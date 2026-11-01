import YAML from 'yaml';
import type { z } from 'zod';
import { AppError } from '@/errors/app-error';

export function parseYaml<T extends z.ZodType>(content: string, schema: T): z.infer<T> {
	const parsed = YAML.parse(content);

	const result = schema.safeParse(parsed);

	if (!result.success) {
		throw new AppError({
			type: 'yaml/validation-failed',
			title: 'YAMLの形式が不正です',
			status: 500,
			detail: result.error.message,
		});
	}

	return result.data;
}
