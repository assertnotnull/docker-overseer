<script lang="ts">
	import type { DockerContainerOption, ManagedServiceView } from '#lib/domain/types';

	type Props = {
		open: boolean;
		initial?: ManagedServiceView | null;
		containers: DockerContainerOption[];
		onclose: () => void;
		onsaved: () => void;
	};

	let { open, initial = null, containers, onclose, onsaved }: Props = $props();

	let displayName = $state('');
	let workingTreePath = $state('');
	let composeProject = $state('');
	let selectedIds = $state<string[]>([]);
	let saving = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		if (!open) return;
		errorMessage = '';
		if (initial) {
			displayName = initial.displayName;
			workingTreePath = initial.workingTreePath;
			composeProject = initial.composeProject;
			selectedIds = [];
		} else {
			displayName = '';
			workingTreePath = '';
			composeProject = '';
			selectedIds = [];
		}
	});

	function basename(path: string): string {
		const p = path.replace(/\/+$/, '');
		const i = p.lastIndexOf('/');
		return i >= 0 ? p.slice(i + 1) : p;
	}

	$effect(() => {
		if (!open || initial) return;
		if (!displayName && workingTreePath) displayName = basename(workingTreePath);
		if (!composeProject && workingTreePath) composeProject = basename(workingTreePath);
	});

	function toggleContainer(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((x) => x !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	async function save() {
		errorMessage = '';
		saving = true;
		const payload: Record<string, unknown> = {
			displayName: displayName.trim(),
			workingTreePath: workingTreePath.trim(),
			composeProject: composeProject.trim()
		};
		if (selectedIds.length > 0) payload.containerIds = selectedIds;
		try {
			const url = initial ? `/api/services/${initial.id}` : '/api/services';
			const method = initial ? 'PATCH' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || res.statusText);
			}
			onsaved();
			onclose();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<div class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()}>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h2 id="dialog-title">{initial ? 'Edit service' : 'Add service'}</h2>

			<label>
				<span>Display name</span>
				<input bind:value={displayName} autocomplete="off" />
			</label>

			<label>
				<span>Working tree path</span>
				<input bind:value={workingTreePath} placeholder="/home/you/projets/api" />
			</label>

			<label>
				<span>Compose project name</span>
				<input bind:value={composeProject} autocomplete="off" />
			</label>

			<div class="field">
				<span class="label">Containers (running)</span>
				{#if containers.length === 0}
					<p class="hint">No running containers. Start a stack, then reopen this dialog.</p>
				{:else}
					<ul class="picker">
						{#each containers as c (c.id)}
							<li>
								<label class="picker-row">
									<input
										type="checkbox"
										checked={selectedIds.includes(c.id)}
										onchange={() => toggleContainer(c.id)}
									/>
									<span class="picker-name">{c.name}</span>
									{#if c.project && c.composeService}
										<span class="picker-meta">{c.project} / {c.composeService}</span>
									{/if}
								</label>
							</li>
						{/each}
					</ul>
				{/if}
				{#if initial?.bindings.length}
					<p class="hint">
						Current bindings stay until you pick at least one container above (edit replaces bindings).
					</p>
				{/if}
			</div>

			{#if errorMessage}
				<p class="error" role="alert">{errorMessage}</p>
			{/if}

			<div class="actions">
				<button type="button" class="ghost" onclick={onclose}>Cancel</button>
				<button
					type="button"
					class="primary"
					disabled={saving || !workingTreePath.trim() || (!initial && selectedIds.length === 0)}
					onclick={save}
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgba(4, 6, 8, 0.72);
	}

	.dialog {
		width: min(28rem, 100%);
		max-height: min(32rem, 90vh);
		overflow: auto;
		padding: 1.25rem 1.35rem 1.1rem;
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
	}

	h2 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		font-weight: 600;
	}

	label,
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.85rem;
	}

	.label {
		font-size: 0.82rem;
		color: var(--muted);
	}

	input[type='text'],
	input:not([type]) {
		padding: 0.45rem 0.55rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
	}

	.picker {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		max-height: 11rem;
		overflow: auto;
	}

	.picker-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 0.55rem;
		align-items: center;
		padding: 0.4rem 0.55rem;
		border-bottom: 1px solid var(--border);
		cursor: pointer;
	}

	.picker li:last-child .picker-row {
		border-bottom: none;
	}

	.picker-name {
		font-family: var(--font-mono);
		font-size: 0.86rem;
	}

	.picker-meta {
		grid-column: 2;
		font-size: 0.78rem;
		color: var(--muted);
	}

	.hint {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.error {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: var(--danger);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	button {
		border-radius: var(--radius);
		border: 1px solid var(--border);
		padding: 0.4rem 0.85rem;
		background: var(--surface);
		color: var(--text);
	}

	button.primary {
		background: var(--accent);
		border-color: transparent;
		color: #041018;
		font-weight: 500;
	}

	button.primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	button.ghost {
		background: transparent;
	}
</style>
