import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reorderServices } from '#lib/server/registry';
import { loadServiceViews } from '#lib/server/services';

export const POST: RequestHandler = async ({ request }) => {
	let body: { orderedIds?: string[] };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body.orderedIds?.length) throw error(400, 'orderedIds is required');
	await reorderServices(body.orderedIds);
	return json({ services: await loadServiceViews() });
};
