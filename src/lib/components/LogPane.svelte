<script lang="ts">
	import type { LogLine, ManagedServiceView } from '#lib/domain/types';

	type Props = {
		service: ManagedServiceView | null;
	};

	let { service }: Props = $props();

	let activeTab = $state(0);
	let filter = $state('');
	let paused = $state(false);
	let linesByTab = $state<Record<number, LogLine[]>>({});
	let streamError = $state<string | null>(null);
	let source: EventSource | null = null;

	const MAX_LINES = 10_000;

	function closeStream() {
		source?.close();
		source = null;
	}

	function startStream() {
		closeStream();
		streamError = null;
		if (!service || paused) return;
		const state = service.bindingStates[activeTab];
		if (!state?.containerId || !state.running) return;

		const url = `/api/services/${service.id}/logs/${activeTab}`;
		source = new EventSource(url);
		source.onmessage = (ev) => {
			try {
				const payload = JSON.parse(ev.data) as
					| { type: 'line'; line: LogLine }
					| { type: 'error'; message: string }
					| { type: 'ready' };
				if (payload.type === 'line') {
					const bucket = [...(linesByTab[activeTab] ?? []), payload.line];
					if (bucket.length > MAX_LINES) bucket.shift();
					linesByTab = { ...linesByTab, [activeTab]: bucket };
				}
				if (payload.type === 'error') streamError = payload.message;
			} catch {
				/* ignore */
			}
		};
		source.onerror = () => {
			streamError = 'Log stream disconnected';
			closeStream();
		};
	}

	$effect(() => {
		if (!service) {
			closeStream();
			linesByTab = {};
			return;
		}
		activeTab = 0;
		linesByTab = {};
		paused = false;
		startStream();
		return () => closeStream();
	});

	$effect(() => {
		activeTab;
		service?.id;
		paused;
		if (service) startStream();
	});

	function togglePause() {
		paused = !paused;
		if (paused) closeStream();
		else startStream();
	}

	function filtered(lines: LogLine[]): LogLine[] {
		const q = filter.trim().toLowerCase();
		if (!q) return lines;
		return lines.filter((l) => l.text.toLowerCase().includes(q));
	}

	const canShowAll = $derived(
		service != null &&
			service.bindingStates.length > 1 &&
			service.bindingStates.every((b) => b.running)
	);
</script>

<div class="log-pane">
	{#if !service}
		<p class="empty">Select a service to tail its container logs, or add your first managed service.</p>
	{:else}
		<header class="toolbar">
			<div class="tabs" role="tablist">
				{#each service.bindingStates as b, i (i)}
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === i}
						class:selected={activeTab === i}
						onclick={() => (activeTab = i)}
					>
						{b.label}
					</button>
				{/each}
				{#if canShowAll}
					<button
						type="button"
						role="tab"
						class:selected={activeTab === -1}
						disabled
						title="Merged view — wire up when all streams expose timestamps"
					>
						All
					</button>
				{/if}
			</div>
			<div class="tools">
				<input
					type="search"
					placeholder="Filter buffer…"
					bind:value={filter}
					aria-label="Filter log buffer"
				/>
				<button type="button" onclick={togglePause}>
					{paused ? 'Resume' : 'Pause'}
				</button>
			</div>
		</header>

		{#if service.bindingsUp < service.bindingsTotal}
			<p class="warn">
				{service.bindingsUp}/{service.bindingsTotal} containers running for this service.
			</p>
		{/if}

		{#if streamError}
			<p class="warn" role="status">{streamError}</p>
		{/if}

		{@const state = service.bindingStates[activeTab]}
		{#if state && !state.running}
			<p class="empty tab-msg">
				Container not running or not found — start it in Docker, then switch tabs or refresh.
			</p>
		{:else}
			<div class="lines" role="log" aria-live="polite">
				{#each filtered(linesByTab[activeTab] ?? []) as line, idx (idx)}
					<div class="line" class:stderr={line.stream === 'stderr'}>
						{line.text}
					</div>
				{:else}
					<p class="empty tab-msg">Waiting for log output…</p>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.log-pane {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.65rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface-raised);
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tabs button {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		padding: 0.25rem 0.55rem;
		border-radius: var(--radius);
		border: 1px solid transparent;
		background: transparent;
		color: var(--muted);
	}

	.tabs button.selected {
		color: var(--text);
		border-color: var(--border);
		background: var(--surface);
	}

	.tabs button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.tools {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.tools input {
		width: 11rem;
		padding: 0.3rem 0.45rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg);
		color: var(--text);
		font-size: 0.82rem;
	}

	.tools button {
		font-size: 0.82rem;
		padding: 0.3rem 0.55rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
	}

	.lines {
		flex: 1;
		overflow: auto;
		padding: 0.65rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.55;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.line.stderr {
		color: var(--stderr);
	}

	.empty,
	.warn,
	.tab-msg {
		padding: 1rem 1.1rem;
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.warn {
		color: var(--stderr);
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
</style>
