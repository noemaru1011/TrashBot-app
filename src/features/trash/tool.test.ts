
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDataFile } from '@/lib/github/github';
import { getNext, getRule, getToday, getTomorrow } from './tool';

vi.mock('@/lib/github/github', () => ({
	getDataFile: vi.fn(),
}));

vi.mock('@/lib/date', () => ({
	getTodayJst: vi.fn(() => '2026-08-20'),

	addDays: (date: string, days: number) => {
		const [year, month, day] = date.split('-').map(Number);
		const result = new Date(Date.UTC(year, month - 1, day + days));

		return [
			result.getUTCFullYear(),
			String(result.getUTCMonth() + 1).padStart(2, '0'),
			String(result.getUTCDate()).padStart(2, '0'),
		].join('-');
	},

	getWeekday: (date: string) => {
		const [year, month, day] = date.split('-').map(Number);
		const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

		return [
			'sunday',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
		][weekday];
	},

	getWeekOfMonth: (date: string) =>
		Math.ceil(Number(date.slice(-2)) / 7),
}));

const MOCKED_GET_DATA_FILE = vi.mocked(getDataFile);

const ENV = {} as Env;

describe('getNext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('指定した種類の次回のゴミ出し日を取得する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: monday
  - type: plastic_packaging
    weekday: thursday
`);

		const result = await getNext('burnable', ENV);

		expect(result).toBe('2026-08-24');
	});

	it('指定した種類のスケジュールが存在しない場合はnullを返す', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: monday
`);

		const result = await getNext('paper', ENV);

		expect(result).toBeNull();
	});

	it('週が指定されていない場合は曜日だけで判定する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: monday
`);

		const result = await getNext('burnable', ENV);

		expect(result).toBe('2026-08-24');
	});

	it('指定した週と曜日の両方が一致した場合に取得する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: plastic_packaging
    weekday: thursday
    week: 4
`);

		const result = await getNext('plastic_packaging', ENV);

		expect(result).toBe('2026-08-27');
	});

	it('指定した週と曜日が一致しない場合は次の候補を探す', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: plastic_packaging
    weekday: thursday
    week: 5
`);

		const result = await getNext('plastic_packaging', ENV);

		expect(result).toBe('2026-10-29');
	});
});

describe('getToday', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('今日のゴミ出し予定を取得する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: thursday
  - type: plastic_packaging
    weekday: thursday
  - type: paper
    weekday: friday
`);

		const result = await getToday(ENV);

		expect(result).toEqual(['burnable', 'plastic_packaging']);
	});

	it('今日にゴミ出し予定がない場合は空配列を返す', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: monday
  - type: paper
    weekday: friday
`);

		const result = await getToday(ENV);

		expect(result).toEqual([]);
	});

	it('週指定のあるスケジュールも判定する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: thursday
    week: 3
  - type: plastic_packaging
    weekday: thursday
    week: 4
`);

		const result = await getToday(ENV);

		expect(result).toEqual(['burnable']);
	});

	it('曜日が一致していても週が違えば対象外になる', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: paper
    weekday: thursday
    week: 4
`);

		const result = await getToday(ENV);

		expect(result).toEqual([]);
	});

	it('週指定がない場合は曜日だけで判定する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: thursday
  - type: paper
    weekday: friday
`);

		const result = await getToday(ENV);

		expect(result).toEqual(['burnable']);
	});

	it('スケジュールファイルを取得する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: thursday
`);

		await getToday(ENV);

		expect(MOCKED_GET_DATA_FILE).toHaveBeenCalledWith(
			'trash/schedule.yaml',
			ENV,
		);
	});
});

describe('getTomorrow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('明日のゴミ出し予定を取得する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: plastic_packaging
    weekday: friday
  - type: paper
    weekday: friday
  - type: burnable
    weekday: monday
`);

		const result = await getTomorrow(ENV);

		expect(result).toEqual(['plastic_packaging', 'paper']);
	});

	it('明日にゴミ出し予定がない場合は空配列を返す', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: burnable
    weekday: monday
  - type: paper
    weekday: thursday
`);

		const result = await getTomorrow(ENV);

		expect(result).toEqual([]);
	});

	it('週指定のあるスケジュールも判定する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: plastic_packaging
    weekday: friday
    week: 3
  - type: paper
    weekday: friday
    week: 4
`);

		const result = await getTomorrow(ENV);

		expect(result).toEqual(['plastic_packaging']);
	});

	it('曜日が一致していても週が違えば対象外になる', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
schedule:
  - type: paper
    weekday: friday
    week: 4
`);

		const result = await getTomorrow(ENV);

		expect(result).toEqual([]);
	});
});

describe('getRule', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('指定した物の分別ルールを取得する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
rules:
  - name: ペットボトル
    type: plastic_bottle
    note: キャップとラベルを外す
  - name: 瓶
    type: cans_bottles
`);

		const result = await getRule('ペットボトル', 'ぺっとぼとる', ENV);

		expect(result).toBe('plastic_bottle');
		expect(MOCKED_GET_DATA_FILE).toHaveBeenCalledWith('trash/ha.yaml', ENV);
	});

	it('指定した物が存在しない場合はnullを返す', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
rules:
  - name: ペットボトル
    type: plastic_bottle
`);

		const result = await getRule('空き缶', 'あきかん', ENV);

		expect(result).toBeNull();
		expect(MOCKED_GET_DATA_FILE).toHaveBeenCalledWith('trash/a.yaml', ENV);
	});

	it('読み仮名の先頭文字に応じて検索ファイルを選択する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
rules:
  - name: 瓶
    type: cans_bottles
`);

		const result = await getRule('瓶', 'びん', ENV);

		expect(result).toBe('cans_bottles');
		expect(MOCKED_GET_DATA_FILE).toHaveBeenCalledWith('trash/ha.yaml', ENV);
	});

	it('読み仮名の先頭が対象外の場合はother.yamlを使用する', async () => {
		MOCKED_GET_DATA_FILE.mockResolvedValue(`
rules:
  - name: ABC
    type: city_not_handled
`);

		const result = await getRule('ABC', 'ABC', ENV);

		expect(result).toBe('city_not_handled');
		expect(MOCKED_GET_DATA_FILE).toHaveBeenCalledWith(
			'trash/other.yaml',
			ENV,
		);
	});
});
