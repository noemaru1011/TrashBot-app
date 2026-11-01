export type ProblemDetails = {
	type: string;
	title: string;
	status: number;
	detail: string;
	instance?: string;
};

export class AppError extends Error {
	constructor(public readonly problem: ProblemDetails) {
		super(problem.detail);

		this.name = 'AppError';
	}
}
