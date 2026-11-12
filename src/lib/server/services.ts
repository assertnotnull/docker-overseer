import type { ManagedServiceView } from '#lib/domain/types';
import { resolveBranch } from './git';
import {
	aggregateRuntimeStatus,
	resolveBindingStates
} from './docker';
import { listServices } from './registry';

export async function loadServiceViews(): Promise<ManagedServiceView[]> {
	const services = await listServices();
	const views: ManagedServiceView[] = [];
	for (const service of services) {
		const [branch, bindingStates] = await Promise.all([
			resolveBranch(service.workingTreePath),
			resolveBindingStates(service.bindings)
		]);
		const bindingsUp = bindingStates.filter((b) => b.running).length;
		views.push({
			...service,
			branch,
			runtimeStatus: aggregateRuntimeStatus(bindingStates),
			bindingsUp,
			bindingsTotal: service.bindings.length,
			bindingStates
		});
	}
	return views;
}

export async function viewForService(id: string): Promise<ManagedServiceView | null> {
	const views = await loadServiceViews();
	return views.find((s) => s.id === id) ?? null;
}
