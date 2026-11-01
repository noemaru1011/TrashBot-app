import { type FunctionDeclaration, Type } from '@google/genai';
import { AppError } from '@/errors/app-error';
import {
	trashRuleItem as trashDataRuleItemSchema,
	trashScheduleSchema as trashDataScheduleSchema,
} from '@/features/trash/schemas';
import * as TrashTools from '@/features/trash/tool';

type ToolArgs = Record<string, unknown>;

type ToolContext = {
	env: Env;
};

type AppTool = {
	// toolの説明書
	declaration: FunctionDeclaration;

	// 実際に呼び出されたときの処理
	execute: (args: ToolArgs, context: ToolContext) => Promise<unknown>;
};


const TOOLS = {
	trash_get_next: {
		declaration: {
			name: 'trash_get_next',
			description:
				'指定した種類の次回のゴミ出し日を取得する。曜日だけでなく、第1・第3金曜日などの収集条件も地域のルールに従って判定する。一般常識では判断せず、登録された地域のルールを正として使用する。',
			parameters: {
				type: Type.OBJECT,
				properties: {
					type: {
						type: Type.STRING,
						description:
							'ゴミの種類。burnable=燃やすごみ、garden_pruning=植木剪定材、plastic_packaging=容器包装プラスチック、paper=紙類、cloth=布類、plastic_bottle=ペットボトル、cans_bottles=カン・ビン、non_burnable=燃えないごみ、hazardous=危険有害ごみ、used_cooking_oil=使用済み食用油、plastic_product=製品プラスチック、bulky=粗大ごみ、large_bulky=大型粗大ごみ、rod_board_bulky=棒状・板状等粗大ごみ、rod_board_special_bulky=棒状・板状等特定粗大ごみ、city_not_handled=市では収集しないごみ',
						enum: [
							'burnable',
							'garden_pruning',
							'plastic_packaging',
							'paper',
							'cloth',
							'plastic_bottle',
							'cans_bottles',
							'non_burnable',
							'hazardous',
							'used_cooking_oil',
							'plastic_product',
							'bulky',
							'large_bulky',
							'rod_board_bulky',
							'rod_board_special_bulky',
							'city_not_handled',
						],
					},
				},
				required: ['type'],
			},
		},

		execute: async (args, { env }) => {
			const input = trashDataScheduleSchema.shape.schedule.element
				.pick({
					type: true,
				})
				.parse({
					type: args.type,
				});

			return TrashTools.getNext(input.type, env);
		},
	},

	trash_get_today: {
		declaration: {
			name: 'trash_get_today',
			description:
				'今日のゴミ出し予定を取得する。日本時間の今日の日付、曜日、第何週かを地域の収集ルールと照合する。一般常識では判断せず、登録された地域のルールを正として使用する。',
			parameters: {
				type: Type.OBJECT,
				properties: {},
			},
		},

		execute: async (_args, { env }) => {
			return TrashTools.getToday(env);
		},
	},

	trash_get_tomorrow: {
		declaration: {
			name: 'trash_get_tomorrow',
			description:
				'明日のゴミ出し予定を取得する。曜日だけでなく、第1・第3金曜日などの収集条件も考慮する。一般常識では判断せず、登録された地域のルールを正として使用する。',
			parameters: {
				type: Type.OBJECT,
				properties: {},
			},
		},

		execute: async (_args, { env }) => {
			return TrashTools.getTomorrow(env);
		},
	},

	trash_get_rule: {
		declaration: {
			name: 'trash_get_rule',
			description:
				'指定した物の分別ルールを取得する。物の名前と読み方から五十音の行を特定し、該当する地域の分別ルールを検索する。分別方法そのものは登録されたルールを正とし、一般常識では判断しない。例: 缶→かん→か行、牛乳パック→ぎゅうにゅうぱっく→か行、ペットボトル→ぺっとぼとる→は行、アイロン→あいろん→あ行。',
			parameters: {
				type: Type.OBJECT,
				properties: {
					name: {
						type: Type.STRING,
						description: '分別を確認したい物。例: 缶、牛乳パック、ペットボトル、アイロン',
					},
					reading: {
						type: Type.STRING,
						description:
							'物の名前の読み方。ひらがなで指定する。例: 缶→かん、牛乳パック→ぎゅうにゅうぱっく、ペットボトル→ぺっとぼとる、アイロン→あいろん',
					},
				},
				required: ['name', 'reading'],
			},
		},

		execute: async (args, { env }) => {
			const input = trashDataRuleItemSchema
				.pick({
					name: true,
				})
				.parse({
					name: args.name,
				});

			return TrashTools.getRule(input.name, args.reading as string, env);
		},
	},


} satisfies Record<string, AppTool>;

// tool定義の中から説明文のみ取得
export function getToolDeclarations(): FunctionDeclaration[] {
	return Object.values(TOOLS).map((tool) => tool.declaration);
}

// Geminiが指定したTool名を実際の関数に変換して実行する
// 分岐はあるが薄いためテストしない
export async function executeTool(name: string, args: ToolArgs, env: Env): Promise<unknown> {
	const tool = TOOLS[name as keyof typeof TOOLS];

	if (!tool) {
		throw new AppError({
			type: 'gemini/unknown-tool',
			title: '未知のGemini Toolが指定されました',
			status: 500,
			detail: `Unknown tool: ${name}`,
		});
	}

	return tool.execute(args, { env });
}
