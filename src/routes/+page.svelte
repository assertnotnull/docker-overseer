<script lang="ts">
	import { onMount } from 'svelte';
	import type { DockerContainerOption, ManagedServiceView } from '#lib/domain/types';
	import ServiceDialog from '#lib/components/ServiceDialog.svelte';
	import LogPane from '#lib/components/LogPane.svelte';

	let services = $state<ManagedServiceView[]>([]);
	let selectedId = $state<string | null>(null);
	let containers = $state<DockerContainerOption[]>([]);
	let dialogOpen = $state(false);
	let editing = $state<ManagedServiceView | null>(null);
	let loadError = $state<string | null>(null);
	let draggingId = $state<string | null>(null);

	const selected = $derived(services.find((s) => s.id === selectedId) ?? null);

	async function fetchServices() {
		try {
			const res = await fetch('/api/services');
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { services: ManagedServiceView[] };
			services = data.services;
			if (selectedId && !services.some((s) => s.id === selectedId)) {
				selectedId = null;
			}
			loadError = null;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load services';
		}
	}

	async function fetchContainers() {
		try {
			const res = await fetch('/api/docker/containers');
			if (!res.ok) return;
			const data = (await res.json()) as { containers: DockerContainerOption[] };
			containers = data.containers;
		} catch {
			containers = [];
		}
	}

	function openAdd() {
		editing = null;
		dialogOpen = true;
		void fetchContainers();
	}

	function openEdit(svc: ManagedServiceView) {
		editing = svc;
		dialogOpen = true;
		void fetchContainers();
	}

	async function confirmDelete(svc: ManagedServiceView) {
		if (!confirm(`Delete “${svc.displayName}”?`)) return;
		await fetch(`/api/services/${svc.id}`, { method: 'DELETE' });
		if (selectedId === svc.id) selectedId = null;
		await fetchServices();
	}

	function onDragStart(id: string, e: DragEvent) {
		draggingId = id;
		e.dataTransfer?.setData('text/plain', id);
		e.dataTransfer!.effectAllowed = 'move';
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';
	}

	async function onDrop(targetId: string) {
		if (!draggingId || draggingId === targetId) return;
		const ids = services.map((s) => s.id);
		const from = ids.indexOf(draggingId);
		const to = ids.indexOf(targetId);
		if (from < 0 || to < 0) return;
		ids.splice(from, 1);
		ids.splice(to, 0, draggingId);
		draggingId = null;
		const res = await fetch('/api/services/reorder', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ orderedIds: ids })
		});
		if (res.ok) await fetchServices();
	}

	let pollTimer: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		void fetchServices();
		const schedule = () => {
			if (pollTimer) clearInterval(pollTimer);
			if (document.hidden) return;
			pollTimer = setInterval(() => void fetchServices(), 5000);
		};
		schedule();
		const onVis = () => schedule();
		document.addEventListener('visibilitychange', onVis);
		return () => {
			if (pollTimer) clearInterval(pollTimer);
			document.removeEventListener('visibilitychange', onVis);
		};
	});
</script>

<svelte:head>
	<title>Docker Overseer</title>
</svelte:head>

<div class="shell">
	<aside class="sidebar">
		<header class="sidebar-head">
			<h1>Overseer</h1>
			<button type="button" class="add" onclick={openAdd}>Add service</button>
		</header>

		{#if loadError}
			<p class="sidebar-error" role="alert">{loadError}</p>
		{/if}

		<ul class="service-list">
			{#if services.length === 0}
				<li class="empty-list">
					<p>No managed services yet.</p>
					<button type="button" onclick={openAdd}>Add service</button>
				</li>
			{:else}
				{#each services as svc (svc.id)}
					<li>
						<div
							class="row"
							class:selected={selectedId === svc.id}
							class:stopped={svc.runtimeStatus === 'stopped'}
							class:error={svc.runtimeStatus === 'error'}
							draggable="true"
							ondragstart={(e) => onDragStart(svc.id, e)}
							ondragover={onDragOver}
							ondrop={() => onDrop(svc.id)}
						>
							<button type="button" class="main" onclick={() => (selectedId = svc.id)}>
								<span class="name">
									{#if svc.runtimeStatus === 'error'}
										<span class="icon" aria-hidden="true">⚠</span>
									{/if}
									{svc.displayName}
								</span>
								<span class="branch">{svc.branch}</span>
							</button>
							<div class="menu">
								<button type="button" title="Edit" onclick={() => openEdit(svc)}>⋯</button>
								<div class="menu-pop">
									<button type="button" onclick={() => openEdit(svc)}>Edit</button>
									<button type="button" class="danger" onclick={() => confirmDelete(svc)}>
										Delete
									</button>
								</div>
							</div>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</aside>

	<main class="main">
		<LogPane service={selected} />
	</main>
</div>

<ServiceDialog
	open={dialogOpen}
	initial={editing}
	{containers}
	onclose={() => (dialogOpen = false)}
	onsaved={fetchServices}
/>

<style>
	.shell {
		display: grid;
		grid-template-columns: minmax(15rem, 22rem) 1fr;
		gap: 0.75rem;
		height: 100vh;
		padding: 0.75rem;
		box-sizing: border-box;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.sidebar-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.85rem;
		border-bottom: 1px solid var(--border);
	}

	h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	button.add {
		font-size: 0.82rem;
		padding: 0.35rem 0.65rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface-raised);
		color: var(--text);
	}

	.sidebar-error {
		margin: 0;
		padding: 0.5rem 0.85rem;
		font-size: 0.82rem;
		color: var(--danger);
		border-bottom: 1px solid var(--border);
	}

	.service-list {
		margin: 0;
		padding: 0.35rem;
		list-style: none;
		overflow: auto;
		flex: 1;
	}

	.empty-list {
		padding: 1rem 0.75rem;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.empty-list button {
		margin-top: 0.5rem;
		padding: 0.35rem 0.65rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface-raised);
		color: var(--text);
	}

	.row {
		display: flex;
		align-items: stretch;
		border-radius: var(--radius);
		border: 1px solid transparent;
	}

	.row.selected {
		border-color: var(--border);
		background: var(--surface-raised);
	}

	.row.stopped .name {
		color: var(--stopped);
	}

	.row.error .name {
		color: var(--danger);
	}

	button.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		padding: 0.5rem 0.55rem;
		border: none;
		background: transparent;
		color: var(--text);
		text-align: left;
	}

	.name {
		font-weight: 500;
		font-size: 0.92rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.icon {
		font-size: 0.85rem;
	}

	.branch {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted);
	}

	.menu {
		position: relative;
		display: flex;
		align-items: center;
	}

	.menu > button {
		padding: 0.35rem 0.45rem;
		border: none;
		background: transparent;
		color: var(--muted);
	}

	.menu-pop {
		display: none;
		position: absolute;
		right: 0;
		top: 100%;
		z-index: 5;
		min-width: 7rem;
		padding: 0.25rem;
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}

	.menu:hover .menu-pop,
	.menu:focus-within .menu-pop {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.menu-pop button {
		text-align: left;
		padding: 0.35rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text);
		font-size: 0.82rem;
	}

	.menu-pop button.danger {
		color: var(--danger);
	}

	.main {
		min-width: 0;
		min-height: 0;
	}

	@media (max-width: 720px) {
		.shell {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
			height: auto;
			min-height: 100vh;
		}

		.sidebar {
			max-height: 40vh;
		}
	}
</style>
