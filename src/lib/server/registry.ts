import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import YAML from 'yaml';
import { CONFIG_DIR, REGISTRY_PATH } from './config';
import type { ContainerBinding, ManagedService, RegistryFile } from '#lib/domain/types';

function emptyRegistry(): RegistryFile {
	return { version: 1, services: [] };
}

export async function loadRegistry(): Promise<RegistryFile> {
	try {
		const raw = await readFile(REGISTRY_PATH, 'utf8');
		const parsed = YAML.parse(raw) as RegistryFile | null;
		if (!parsed?.services) return emptyRegistry();
		return { version: 1, services: parsed.services };
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
			return emptyRegistry();
		}
		throw e;
	}
}

export async function saveRegistry(registry: RegistryFile): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true });
	await writeFile(REGISTRY_PATH, YAML.stringify(registry), 'utf8');
}

export async function listServices(): Promise<ManagedService[]> {
	const registry = await loadRegistry();
	return [...registry.services].sort((a, b) => a.order - b.order);
}

export async function createService(input: {
	displayName?: string;
	workingTreePath: string;
	composeProject?: string;
	bindings: ContainerBinding[];
}): Promise<ManagedService> {
	const registry = await loadRegistry();
	const maxOrder = registry.services.reduce((m, s) => Math.max(m, s.order), -1);
	const service: ManagedService = {
		id: crypto.randomUUID(),
		displayName:
			input.displayName?.trim() || basename(input.workingTreePath) || 'Unnamed',
		workingTreePath: input.workingTreePath,
		composeProject:
			input.composeProject?.trim() || basename(input.workingTreePath) || '',
		bindings: input.bindings,
		order: maxOrder + 1
	};
	registry.services.push(service);
	await saveRegistry(registry);
	return service;
}

export async function updateService(
	id: string,
	patch: Partial<
		Pick<ManagedService, 'displayName' | 'workingTreePath' | 'composeProject' | 'bindings'>
	>
): Promise<ManagedService | null> {
	const registry = await loadRegistry();
	const idx = registry.services.findIndex((s) => s.id === id);
	if (idx === -1) return null;
	const current = registry.services[idx];
	registry.services[idx] = { ...current, ...patch, id: current.id, order: current.order };
	await saveRegistry(registry);
	return registry.services[idx];
}

export async function deleteService(id: string): Promise<boolean> {
	const registry = await loadRegistry();
	const before = registry.services.length;
	registry.services = registry.services.filter((s) => s.id !== id);
	if (registry.services.length === before) return false;
	await saveRegistry(registry);
	return true;
}

export async function reorderServices(orderedIds: string[]): Promise<void> {
	const registry = await loadRegistry();
	const byId = new Map(registry.services.map((s) => [s.id, s]));
	const next: ManagedService[] = [];
	orderedIds.forEach((id, order) => {
		const s = byId.get(id);
		if (s) next.push({ ...s, order });
		byId.delete(id);
	});
	byId.forEach((s) => {
		next.push({ ...s, order: next.length });
	});
	registry.services = next;
	await saveRegistry(registry);
}
