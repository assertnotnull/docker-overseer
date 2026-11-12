import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

async function isGitRepo(path: string): Promise<boolean> {
	try {
		await access(join(path, '.git'));
		return true;
	} catch {
		return false;
	}
}

function gitBranch(path: string): Promise<string> {
	return new Promise((resolve) => {
		const child = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
			cwd: path,
			stdio: ['ignore', 'pipe', 'ignore']
		});
		let out = '';
		child.stdout.on('data', (c) => {
			out += c.toString();
		});
		child.on('close', (code) => {
			resolve(code === 0 ? out.trim() : '—');
		});
		child.on('error', () => resolve('—'));
	});
}

export async function resolveBranch(workingTreePath: string): Promise<string> {
	if (!(await isGitRepo(workingTreePath))) return '—';
	return gitBranch(workingTreePath);
}
