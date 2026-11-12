import Docker from 'dockerode';
import type {
	BindingState,
	ContainerBinding,
	DockerContainerOption,
	LogLine,
	RuntimeStatus
} from '#lib/domain/types';
import { bindingLabel } from '#lib/domain/binding-label';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const COMPOSE_PROJECT = 'com.docker.compose.project';
const COMPOSE_SERVICE = 'com.docker.compose.service';

export function bindingFromInspect(info: Docker.ContainerInspectInfo): ContainerBinding {
	const labels = info.Config?.Labels ?? {};
	const project = labels[COMPOSE_PROJECT];
	const service = labels[COMPOSE_SERVICE];
	if (project && service) {
		return { kind: 'compose', project, service };
	}
	const name = (info.Name ?? '').replace(/^\//, '') || info.Id.slice(0, 12);
	return { kind: 'name', name };
}

function stripSlash(name: string): string {
	return name.replace(/^\//, '');
}

function matchesBinding(info: Docker.ContainerInspectInfo, binding: ContainerBinding): boolean {
	const labels = info.Config?.Labels ?? {};
	if (binding.kind === 'compose') {
		return (
			labels[COMPOSE_PROJECT] === binding.project &&
			labels[COMPOSE_SERVICE] === binding.service
		);
	}
	const name = stripSlash(info.Name ?? '');
	return name === binding.name;
}

function containerError(state: Docker.ContainerInspectInfo['State']): boolean {
	if (!state) return false;
	if (state.OOMKilled) return true;
	if (state.Restarting) return true;
	if (state.Status === 'dead') return true;
	if (state.Status === 'exited' && state.ExitCode !== 0) return true;
	return false;
}

function containerRunning(state: Docker.ContainerInspectInfo['State']): boolean {
	return state?.Status === 'running';
}

export async function listRunningContainerOptions(): Promise<DockerContainerOption[]> {
	const list = await docker.listContainers({ all: false });
	return list.map((c) => {
		const labels = c.Labels ?? {};
		const name = stripSlash(c.Names?.[0] ?? c.Id.slice(0, 12));
		return {
			id: c.Id,
			name,
			project: labels[COMPOSE_PROJECT] ?? null,
			composeService: labels[COMPOSE_SERVICE] ?? null
		};
	});
}

export async function inspectContainer(id: string): Promise<Docker.ContainerInspectInfo> {
	const container = docker.getContainer(id);
	return container.inspect();
}

async function allContainers(): Promise<Docker.ContainerInspectInfo[]> {
	const list = await docker.listContainers({ all: true });
	const results: Docker.ContainerInspectInfo[] = [];
	for (const row of list) {
		try {
			results.push(await inspectContainer(row.Id));
		} catch {
			/* stale row */
		}
	}
	return results;
}

export async function resolveBindingStates(bindings: ContainerBinding[]): Promise<BindingState[]> {
	const containers = await allContainers();
	return bindings.map((binding) => {
		const match = containers.find((c) => matchesBinding(c, binding));
		if (!match) {
			return {
				binding,
				label: bindingLabel(binding),
				running: false,
				error: false,
				containerId: null
			};
		}
		const state = match.State;
		return {
			binding,
			label: bindingLabel(binding),
			running: containerRunning(state),
			error: containerError(state),
			containerId: match.Id
		};
	});
}

export function aggregateRuntimeStatus(states: BindingState[]): RuntimeStatus {
	if (states.length === 0) return 'stopped';
	if (states.some((s) => s.error)) return 'error';
	if (states.every((s) => !s.running)) return 'stopped';
	return 'running';
}

export async function getDocker(): Promise<Docker> {
	return docker;
}

/** Demux docker log stream into lines (handles 8-byte header frames). */
export function parseDockerLogChunk(
	buf: Buffer,
	onLine: (line: LogLine) => void,
	carry = { stdout: '', stderr: '' }
): void {
	let offset = 0;
	while (offset < buf.length) {
		if (buf.length - offset < 8) break;
		const streamType = buf[offset];
		const len = buf.readUInt32BE(offset + 4);
		offset += 8;
		const chunk = buf.subarray(offset, offset + len).toString('utf8');
		offset += len;
		const stream = streamType === 2 ? 'stderr' : 'stdout';
		const parts = (carry[stream] + chunk).split('\n');
		carry[stream] = parts.pop() ?? '';
		for (const text of parts) {
			onLine({ stream, text });
		}
	}
}

export async function followLogs(
	containerId: string,
	onLine: (line: LogLine) => void,
	signal: AbortSignal
): Promise<void> {
	const container = docker.getContainer(containerId);
	const stream = await container.logs({
		follow: true,
		stdout: true,
		stderr: true,
		tail: 200,
		timestamps: true
	});
	const carry = { stdout: '', stderr: '' };
	const abort = () => {
		try {
			(stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
		} catch {
			/* noop */
		}
	};
	signal.addEventListener('abort', abort, { once: true });
	try {
		await new Promise<void>((resolve, reject) => {
			stream.on('data', (chunk: Buffer) => {
				parseDockerLogChunk(chunk, (line) => {
					// RFC3339Nano prefix in line when timestamps: true
					const m = line.text.match(/^(\d{4}-\d{2}-\d{2}T[^\s]+)\s+(.*)$/);
					if (m) {
						onLine({
							...line,
							time: new Date(m[1]),
							text: m[2]
						});
					} else {
						onLine(line);
					}
				}, carry);
			});
			stream.on('error', reject);
			stream.on('end', resolve);
			stream.on('close', resolve);
		});
	} finally {
		signal.removeEventListener('abort', abort);
	}
}
