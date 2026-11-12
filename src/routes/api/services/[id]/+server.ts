import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ContainerBinding } from '#lib/domain/types';
import { deleteService, updateService } from '#lib/server/registry';
import { viewForService } from '#lib/server/services';
import { bindingFromInspect, inspectContainer } from '#lib/server/docker';

export const GET: RequestHandler = async ({ params }) => {
	const view = await viewForService(params.id);
	if (!view) throw error(404, 'Service not found');
	return json({ service: view });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const existing = await viewForService(params.id);
	if (!existing) throw error(404, 'Service not found');

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

	let bindings: ContainerBinding[] | undefined = body.bindings;
	if (body.containerIds?.length) {
		bindings = [];
		for (const id of body.containerIds) {
			const info = await inspectContainer(id);
			bindings.push(bindingFromInspect(info));
		}
	}

	const updated = await updateService(params.id, {
		...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
		...(body.workingTreePath !== undefined ? { workingTreePath: body.workingTreePath } : {}),
		...(body.composeProject !== undefined ? { composeProject: body.composeProject } : {}),
		...(bindings !== undefined ? { bindings } : {})
	});
	if (!updated) throw error(404, 'Service not found');
	const view = await viewForService(params.id);
	return json({ service: view });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const ok = await deleteService(params.id);
	if (!ok) throw error(404, 'Service not found');
	return new Response(null, { status: 204 });
};
