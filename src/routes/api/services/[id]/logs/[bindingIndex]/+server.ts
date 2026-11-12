import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { viewForService } from '#lib/server/services';
import type { LogLine } from '#lib/domain/types';
import { followLogs } from '#lib/server/docker';
import { LOG_BUFFER_MAX } from '#lib/server/config';

export const GET: RequestHandler = async ({ params, request }) => {
	const view = await viewForService(params.id);
	if (!view) throw error(404, 'Service not found');

	const index = Number(params.bindingIndex);
	if (!Number.isInteger(index) || index < 0 || index >= view.bindingStates.length) {
		throw error(400, 'Invalid binding index');
	}

	const bindingState = view.bindingStates[index];
	if (!bindingState.containerId || !bindingState.running) {
		throw error(409, 'Container is not running');
	}

	const encoder = new TextEncoder();
	let closed = false;

	const stream = new ReadableStream({
		start(controller) {
			const ac = new AbortController();
			const lines: string[] = [];

			const push = (payload: unknown) => {
				if (closed) return;
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
			};

			request.signal.addEventListener(
				'abort',
				() => {
					closed = true;
					ac.abort();
					try {
						controller.close();
					} catch {
						/* already closed */
					}
				},
				{ once: true }
			);

			push({ type: 'ready' });

			followLogs(
				bindingState.containerId!,
				(line: LogLine) => {
					lines.push(JSON.stringify(line));
					if (lines.length > LOG_BUFFER_MAX) lines.shift();
					push({ type: 'line', line });
				},
				ac.signal
			)
				.then(() => {
					if (!closed) controller.close();
				})
				.catch((e: unknown) => {
					if (!closed) {
						push({ type: 'error', message: String(e) });
						controller.close();
					}
				});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
