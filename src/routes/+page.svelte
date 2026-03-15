<script lang="ts">
	import GardenCanvas from '$lib/components/GardenCanvas.svelte';
	import FlowerReveal from '$lib/components/FlowerReveal.svelte';
	import JournalEditor from '$lib/components/JournalEditor.svelte';
	import LoginDialog from '$lib/components/LoginDialog.svelte';
	import { entries, isAdmin, cursorDefault, cursorPointer } from '$lib/stores/garden.js';
	import { getTimePhase, getUIThemeStyle } from '$lib/engine/TimeOfDay.js';
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types.js';
	import type { MoodVector } from '$lib/types.js';
	import { fade, fly } from 'svelte/transition';

	const ownerName = env.PUBLIC_OWNER_NAME || 'hikari';

	const phase = getTimePhase();
	const editorThemeStyle = getUIThemeStyle();

	let { data }: { data: PageData } = $props();

	let showLogin = $state(false);
	let showEditor = $state(false);
	let showWelcome = $state(true);

	$effect(() => {
		const timer = setTimeout(() => {
			showWelcome = false;
		}, 4500);
		return () => clearTimeout(timer);
	});

	// Load entries from server
	$effect(() => {
		entries.set(data.entries);
	});

	async function handleSubmit(entry: { title: string; text: string; mood: MoodVector; date: string; tags: string[]; weather?: import('$lib/types.js').Weather; images?: string[]; song?: import('$lib/types.js').Song; flowerSeed?: number }) {
		const res = await fetch('/api/entries', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(entry)
		});

		if (res.ok) {
			const newEntry = await res.json();
			entries.update((e) => [...e, newEntry]);
		} else {
			const err = await res.json();
			throw new Error(err.error || 'Failed to save entry');
		}
	}

	async function handleLogout() {
		await fetch('/api/logout', { method: 'POST' });
		isAdmin.set(false);
	}
</script>

<GardenCanvas />
<FlowerReveal />

{#if showWelcome}
	<div class="welcome phase-{phase}" transition:fade={{ duration: 1200 }}>
		<p in:fly={{ y: -20, duration: 1000, delay: 300 }}>welcome to {ownerName}'s garden</p>
	</div>
{/if}

<!-- Floating UI -->
<div class="ui-overlay phase-{phase}" style="--cursor-pointer:{$cursorPointer}">
	<div class="top-bar">
		<h1 class="site-name">hikari.garden</h1>

		<div class="controls">
			{#if $isAdmin}
				<button class="btn" onclick={() => (showEditor = true)}>+ Write</button>
				<button class="btn btn-ghost" onclick={handleLogout}>Logout</button>
			{:else}
				<button class="btn btn-ghost" onclick={() => (showLogin = true)}>Admin</button>
			{/if}
		</div>
	</div>

	{#if $entries.length === 0 && !$isAdmin}
		<div class="empty-state" transition:fade>
			<p>This garden is waiting for its first flower.</p>
		</div>
	{/if}
</div>

{#if showLogin}
	<LoginDialog onclose={() => (showLogin = false)} />
{/if}

{#if showEditor}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="editor-overlay" style="{editorThemeStyle};cursor:{$cursorDefault}" transition:fade={{ duration: 200 }} onclick={() => (showEditor = false)}>
		<div onclick={(e) => e.stopPropagation()}>
			<JournalEditor onsubmit={handleSubmit} oncancel={() => (showEditor = false)} />
		</div>
	</div>
{/if}

<style>
	.ui-overlay {
		position: fixed;
		inset: 0;
		z-index: 10;
		pointer-events: none;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 28px;
		pointer-events: auto;
	}

	.site-name {
		font-family: 'Darumadrop One', cursive;
		font-size: 20px;
		font-weight: 400;
		letter-spacing: 2px;
		color: rgba(255, 255, 255, 0.7);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
	}

	.phase-day .site-name {
		color: rgba(40, 60, 40, 0.55);
		text-shadow: none;
	}
	.phase-dawn .site-name {
		color: rgba(100, 60, 30, 0.6);
		text-shadow: none;
	}

	.controls {
		display: flex;
		gap: 8px;
	}

	.btn {
		font-family: inherit;
		font-size: 13px;
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.8);
		cursor: var(--cursor-pointer, pointer);
		backdrop-filter: blur(8px);
		transition: background 0.2s;
	}
	.phase-day .btn {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(40, 60, 40, 0.7);
	}
	.phase-dawn .btn {
		background: rgba(100, 60, 20, 0.08);
		color: rgba(100, 60, 30, 0.7);
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.25);
	}
	.phase-day .btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}
	.phase-dawn .btn:hover {
		background: rgba(100, 60, 20, 0.14);
	}

	.btn-ghost {
		background: transparent;
	}
	.btn-ghost:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.phase-day .btn-ghost:hover {
		background: rgba(0, 0, 0, 0.06);
	}
	.phase-dawn .btn-ghost:hover {
		background: rgba(100, 60, 20, 0.08);
	}

	.empty-state {
		position: absolute;
		bottom: 40%;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		pointer-events: none;
	}

	.empty-state p {
		font-size: 16px;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 1px;
	}
	.phase-day .empty-state p {
		color: rgba(40, 60, 40, 0.35);
	}
	.phase-dawn .empty-state p {
		color: rgba(100, 60, 30, 0.4);
	}

	.welcome {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		justify-content: center;
		padding-top: 30vh;
		pointer-events: none;
	}

	.welcome p {
		font-family: 'Darumadrop One', cursive;
		font-size: 28px;
		font-weight: 400;
		letter-spacing: 4px;
		color: rgba(255, 255, 255, 0.85);
		text-shadow: 0 0 30px rgba(255, 255, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.4);
	}
	.welcome.phase-day p {
		color: rgba(40, 60, 40, 0.65);
		text-shadow: 0 1px 8px rgba(255, 255, 255, 0.5);
	}
	.welcome.phase-dawn p {
		color: rgba(100, 60, 30, 0.7);
		text-shadow: 0 1px 8px rgba(255, 245, 230, 0.4);
	}

	.editor-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--ui-overlay);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
