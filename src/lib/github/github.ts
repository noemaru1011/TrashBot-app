import { Base64 } from 'js-base64';
import { AppError } from '@/errors/app-error';

const GITHUB_API_URL = 'https://api.github.com';

//3項目だけ定義
type GitHubFileResponse = {
	content: string;
	encoding: string;
	sha: string;
};

/**
 * GitHubのPrivate Repositoryにある
 * dataディレクトリ配下のファイルを取得する。
 */
export async function getDataFile(filename: string, env: Env): Promise<string> {
	//GitHub APIのURLを作る
	//ハードコーディング
	const path = `data/${filename}`;
	const url =
		`${GITHUB_API_URL}/repos/` +
		`${env.GITHUB_OWNER}/` +
		`${env.GITHUB_REPOSITORY}/` +
		`contents/${path}`;

	//GitHub APIを呼び出し
	const response = await fetch(url, {
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${env.GITHUB_TOKEN}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'TrashBot',
		},
	});

	if (!response.ok) {
		throw new AppError({
			type: 'github/file-fetch-failed',
			title: 'GitHubファイルの取得に失敗しました',
			status: response.status,
			detail: `Failed to fetch ${path}: ${response.statusText}`,
		});
	}

	const data = (await response.json()) as GitHubFileResponse;

	if (data.encoding !== 'base64') {
		throw new AppError({
			type: 'github/unsupported-encoding',
			title: 'GitHubファイルのエンコーディングが未対応です',
			status: 500,
			detail: `Unsupported encoding: ${data.encoding}`,
		});
	}

	return Base64.decode(data.content);
}

/**
 * GitHubのPrivate Repositoryにある
 * dataディレクトリ配下のファイルを作成または更新する。
 */
export async function upsertDataFile(filename: string, content: string, env: Env): Promise<void> {
	/////これは現在のファイルのSHAを取得するため
	//GitHub APIのURLを作る
	const path = `data/${filename}`;
	const url =
		`${GITHUB_API_URL}/repos/` +
		`${env.GITHUB_OWNER}/` +
		`${env.GITHUB_REPOSITORY}/` +
		`contents/${path}`;

	//GitHub APIを呼び出し
	const currentResponse = await fetch(url, {
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${env.GITHUB_TOKEN}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'TrashBot',
		},
	});

	let sha: string | undefined;

	if (currentResponse.ok) {
		const currentData = (await currentResponse.json()) as GitHubFileResponse;
		sha = currentData.sha;
	}
	//upsertのため404なら新規作成するため
	else if (currentResponse.status !== 404) {
		throw new AppError({
			type: 'github/file-metadata-fetch-failed',
			title: 'GitHubファイル情報の取得に失敗しました',
			status: currentResponse.status,
			detail: `Failed to get file SHA: ${currentResponse.statusText}`,
		});
	}

	const encodedContent = Base64.encode(content);

	//GitHub APIを呼び出し(更新)
	const response = await fetch(url, {
		method: 'PUT',
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${env.GITHUB_TOKEN}`,
			'Content-Type': 'application/json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'TrashBot',
		},
		body: JSON.stringify({
			message: `Update ${path}`,
			content: encodedContent,
			...(sha ? { sha } : {}),
		}),
	});

	if (!response.ok) {
		throw new AppError({
			type: 'github/file-update-failed',
			title: 'GitHubファイルの更新に失敗しました',
			status: response.status,
			detail: `Failed to update ${path}: ${response.statusText}`,
		});
	}
}
