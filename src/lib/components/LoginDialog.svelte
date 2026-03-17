<script lang="ts">
	import { fade } from 'svelte/transition';
	import { isAdmin, cursorDefault, cursorPointer } from '$lib/stores/garden.js';
	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		if (!password || loading) return;
		loading = true;
		error = '';

		try {
			const res = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});

			if (res.ok) {
				isAdmin.set(true);
				onclose();
			} else {
				error = 'Invalid password';
				password = '';
			}
		} catch {
			error = 'Connection error';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" style="cursor:{$cursorDefault}" transition:fade={{ duration: 200 }} onclick={onclose}>
	<div class="dialog" onclick={(e) => e.stopPropagation()}>
		<h2>enter the garden?</h2>
		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
			<input
				type="password"
				bind:value={password}
				placeholder="key"
				class="password-input"
				autofocus
			/>
			{#if error}
				<div class="error">{error}</div>
			{/if}
			<button type="submit" disabled={loading}>
				{loading ? '...' : 'unlock'}
			</button>
		</form>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--ui-overlay);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.dialog {
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 36px 32px;
		width: 300px;
		text-align: center;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
	}

	h2 {
		font-weight: 400;
		font-size: 18px;
		margin: 0 0 24px;
		letter-spacing: 1.5px;
		color: var(--ui-text-soft);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.password-input {
		font-family: inherit;
		font-size: 14px;
		padding: 12px 16px;
		border: 1px solid var(--ui-input-border);
		border-radius: 10px;
		background: var(--ui-input);
		color: var(--ui-text);
		text-align: center;
		outline: none;
		transition: border-color 0.2s;
	}
	.password-input:focus {
		border-color: var(--ui-input-focus);
	}
	.password-input::placeholder {
		color: var(--ui-text-muted);
	}

	button {
		font-family: inherit;
		font-size: 13px;
		padding: 10px 20px;
		border: none;
		border-radius: 10px;
		background: var(--ui-accent);
		color: #fff;
		cursor: inherit;
		letter-spacing: 0.5px;
		transition: background 0.2s;
	}
	button:hover:not(:disabled) {
		background: var(--ui-accent-hover);
	}
	button:disabled {
		opacity: 0.4;
	}

	.error {
		color: #e05050;
		font-size: 12px;
	}
</style>
