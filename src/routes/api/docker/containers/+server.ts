import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listRunningContainerOptions } from '#lib/server/docker';

export const GET: RequestHandler = async () => {
	try {
		return json({ containers: await listRunningContainerOptions() });
	} catch (e) {
		console.error(e);
		throw error(503, 'Docker is not available');
	}
};
