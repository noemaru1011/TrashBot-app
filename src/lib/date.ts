
const JST = 'Asia/Tokyo';

export type DateString = `${number}-${number}-${number}`;

export type Weekday =
	| 'sunday'
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday';

const WEEKDAYS: Weekday[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
];

/**
 * 日本時刻で今日の日付を取得する。
 */
export function getTodayJst(): DateString {
	return new Intl.DateTimeFormat('sv-SE', {
		timeZone: JST,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date()) as DateString;
}

/**
 * 日付に日数を加算する。
 * 暦日の計算にはUTCを使用し、実行環境のタイムゾーンに依存させない。
 */
export function addDays(date: DateString, days: number): DateString {
	const [year, month, day] = date.split('-').map(Number);
	const result = new Date(Date.UTC(year, month - 1, day + days));

	return [
		result.getUTCFullYear(),
		String(result.getUTCMonth() + 1).padStart(2, '0'),
		String(result.getUTCDate()).padStart(2, '0'),
	].join('-') as DateString;
}

/**
 * 日付から曜日を取得する。
 */
export function getWeekday(date: DateString): Weekday {
	const [year, month, day] = date.split('-').map(Number);
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

	return WEEKDAYS[weekday];
}

/**
 * 月の中で、その曜日が何回目に出現するかを取得する。
 *
 * 例:
 * 2026-08-06(木) → 1
 * 2026-08-13(木) → 2
 * 2026-08-20(木) → 3
 * 2026-08-27(木) → 4
 */
export function getWeekOfMonth(date: DateString): number {
	const day = Number(date.slice(-2));
	return Math.ceil(day / 7);
}
