
import {
	trashRuleSchema,
	trashScheduleSchema,
	type TrashType,
} from '@/features/trash/schemas';
import { getDataFile } from '@/lib/github/github';
import { parseYaml } from '@/lib/yaml';
import {
	addDays,
	getTodayJst,
	getWeekday,
	getWeekOfMonth,
	type DateString,
} from '@/lib/date';

/**
 * 指定した日付のゴミ出し予定を取得する。
 */
function getScheduledTypes(
	schedule: ReturnType<typeof trashScheduleSchema.parse>['schedule'],
	date: DateString,
): TrashType[] {
	const weekday = getWeekday(date);
	const week = getWeekOfMonth(date);

	return schedule
		.filter(
			(item) =>
				item.weekday === weekday &&
				(item.week === undefined || item.week === week),
		)
		.map((item) => item.type);
}

/**
 * 次回の指定した種類のゴミ出し日を取得する。
 */
export async function getNext(
	type: string,
	env: Env,
): Promise<string | null> {
	const content = await getDataFile('trash/schedule.yaml', env);
	const data = parseYaml(content, trashScheduleSchema);

	const schedule = data.schedule.filter((item) => item.type === type);

	if (schedule.length === 0) {
		return null;
	}

	const today = getTodayJst();

	for (let i = 1; i <= 365; i++) {
		const date = addDays(today, i);
		const matched = getScheduledTypes(schedule, date);

		if (matched.length > 0) {
			return date;
		}
	}

	return null;
}

/**
 * 今日のゴミ出し予定を取得する。
 */
export async function getToday(env: Env): Promise<TrashType[]> {
	const content = await getDataFile('trash/schedule.yaml', env);
	const data = parseYaml(content, trashScheduleSchema);

	return getScheduledTypes(data.schedule, getTodayJst());
}

/**
 * 明日のゴミ出し予定を取得する。
 */
export async function getTomorrow(env: Env): Promise<TrashType[]> {
	const content = await getDataFile('trash/schedule.yaml', env);
	const data = parseYaml(content, trashScheduleSchema);

	const tomorrow = addDays(getTodayJst(), 1);

	return getScheduledTypes(data.schedule, tomorrow);
}

/**
 * 指定した物の分別ルールを取得する。
 */
export async function getRule(
	name: string,
	reading: string,
	env: Env,
): Promise<string | null> {
	const filename = `trash/${getRuleFile(reading)}.yaml`;
	const content = await getDataFile(filename, env);
	const data = parseYaml(content, trashRuleSchema);

	const rule = data.rules.find((item) => item.name === name);

	return rule?.type ?? null;
}

/**
 * ゴミ分別ルールの検索先ファイルを決定する。
 */
function getRuleFile(name: string): string {
	const first = name.trim().charAt(0);

	if ('あいうえお'.includes(first)) return 'a';
	if ('かきくけこがぎぐげご'.includes(first)) return 'ka';
	if ('さしすせそざじずぜぞ'.includes(first)) return 'sa';
	if ('たちつてとだぢづでど'.includes(first)) return 'ta';
	if ('なにぬねの'.includes(first)) return 'na';
	if ('はひふへほばびぶべぼぱぴぷぺぽ'.includes(first)) return 'ha';
	if ('まみむめも'.includes(first)) return 'ma';
	if ('やゆよ'.includes(first)) return 'ya';
	if ('らりるれろ'.includes(first)) return 'ra';
	if ('わをん'.includes(first)) return 'wa';

	return 'other';
}
