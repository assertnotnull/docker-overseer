import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ContainerBinding } from '#lib/domain/types';
import { createService } from '#lib/server/registry';
import { loadServiceViews } from '#lib/server/services';
import { bindingFromInspect, inspectContainer } from '#lib/server/docker';

export const GET: RequestHandler = async () => {
	try {
		return json({ services: await loadServiceViews() });
	} catch (e) {
		console.error(e);
		throw error(503, 'Could not reach Docker or load registry');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let body: {
		displayName?: string;
		workingTreePath?: string;
		composeProject?: string;
		containerIds?: string[];
		bindings?: ContainerBinding[];
	};
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body.workingTreePath?.trim()) {
		throw error(400, 'workingTreePath is required');
	}

	let bindings: ContainerBinding[] = body.bindings ?? [];
	if (body.containerIds?.length) {
		bindings = [];
		for (const id of body.containerIds) {
			const info = await inspectContainer(id);
			bindings.push(bindingFromInspect(info));
		}
	}

	if (bindings.length === 0) {
		throw error(400, 'At least one container binding is required');
	}

	try {
		const service = await createService({
			displayName: body.displayName,
			workingTreePath: body.workingTreePath.trim(),
			composeProject: body.composeProject,
			bindings
		});
		return json({ service }, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(503, 'Could not save service');
	}
};
