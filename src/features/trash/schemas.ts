import { z } from 'zod';

const WEEKDAY_SCHEMA = z.enum([
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
]);

const TRASH_TYPE_SCHEMA = z.enum([
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
]);

const TRASH_SCHEDULE_ITEM_SCHEMA = z.object({
	weekday: WEEKDAY_SCHEMA,
	week: z.number().int().min(1).max(5).optional(),
	type: TRASH_TYPE_SCHEMA,
});

const TRASH_RULE_ITEM_SCHEMA = z.object({
	name: z.string(),
	type: TRASH_TYPE_SCHEMA,
	note: z.string().optional(),
});

export const trashScheduleSchema = z.object({
	schedule: z.array(TRASH_SCHEDULE_ITEM_SCHEMA),
});

export const trashRuleSchema = z.object({
	rules: z.array(TRASH_RULE_ITEM_SCHEMA),
});

export const trashRuleItem = TRASH_RULE_ITEM_SCHEMA;
export type TrashType = z.infer<typeof TRASH_TYPE_SCHEMA>;