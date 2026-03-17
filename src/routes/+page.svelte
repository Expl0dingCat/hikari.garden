<script lang="ts">
	import GardenCanvas from '$lib/components/GardenCanvas.svelte';
	import FlowerReveal from '$lib/components/FlowerReveal.svelte';
	import JournalEditor from '$lib/components/JournalEditor.svelte';
	import LoginDialog from '$lib/components/LoginDialog.svelte';
	import GardenStats from '$lib/components/GardenStats.svelte';
	import { entries, isAdmin, cursorDefault, cursorPointer, currentMonth, availableMonths, monthEntries, titleWaveTrigger } from '$lib/stores/garden.js';
	import { getTimePhase, getUIThemeStyle } from '$lib/engine/TimeOfDay.js';
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types.js';
	import type { MoodVector } from '$lib/types.js';
	import { fade, fly } from 'svelte/transition';

	const ownerName = env.PUBLIC_OWNER_NAME || 'hikari';
	const isOriginal = env.PUBLIC_ORIGINAL === 'true';

	const phase = getTimePhase();
	const editorThemeStyle = getUIThemeStyle();

	let { data }: { data: PageData } = $props();

	let showLogin = $state(false);
	let showEditor = $state(false);
	let showWelcome = $state(true);
	let showStats = $state(false);

	// Title wave easter egg — track rapid clicks on site name
	let titleClicks: number[] = [];
	function handleTitleClick() {
		const now = Date.now();
		titleClicks.push(now);
		titleClicks = titleClicks.filter((t) => now - t < 2000);
		if (titleClicks.length >= 5) {
			titleClicks = [];
			titleWaveTrigger.update((n) => n + 1);
		}
	}

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
			// Switch to the new entry's month
			currentMonth.set(newEntry.date.slice(0, 7));
		} else {
			const err = await res.json();
			throw new Error(err.error || 'Failed to save entry');
		}
	}

	function formatMonth(ym: string): string {
		const [y, m] = ym.split('-');
		const d = new Date(parseInt(y), parseInt(m) - 1);
		return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	function prevMonth() {
		const months = $availableMonths;
		const idx = months.indexOf($currentMonth);
		if (idx > 0) currentMonth.set(months[idx - 1]);
	}

	function nextMonth() {
		const months = $availableMonths;
		const idx = months.indexOf($currentMonth);
		if (idx < months.length - 1) currentMonth.set(months[idx + 1]);
	}

	let hasPrev = $derived($availableMonths.indexOf($currentMonth) > 0);
	let hasNext = $derived($availableMonths.indexOf($currentMonth) < $availableMonths.length - 1);

	// When entries load, ensure currentMonth is valid (default to latest month with entries)
	$effect(() => {
		const months = $availableMonths;
		if (months.length > 0 && !months.includes($currentMonth)) {
			currentMonth.set(months[months.length - 1]);
		}
	});

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
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<h1 class="site-name" onclick={handleTitleClick}>hikari.garden</h1>

		<div class="controls">
			{#if isOriginal}
				<a class="btn btn-ghost btn-icon hide-mobile" href="https://github.com/Expl0dingCat/hikari.garden" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg></a>
			{/if}
			{#if $entries.length > 0}
				<button class="btn btn-ghost btn-icon" onclick={() => (showStats = true)} aria-label="Garden stats"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></button>
			{/if}
			{#if $isAdmin}
				<button class="btn btn-plant-btn" onclick={() => (showEditor = true)} aria-label="Plant a flower">
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					<span class="plant-label">Plant</span>
				</button>
				<button class="btn btn-ghost btn-icon" onclick={handleLogout} aria-label="Logout"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
			{:else}
				<button class="btn btn-ghost btn-icon" onclick={() => (showLogin = true)} aria-label="Enter the garden"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></button>
			{/if}
		</div>
	</div>

	{#if $entries.length === 0 && !$isAdmin}
		<div class="empty-state" transition:fade>
			<p>This garden is waiting for its first flower.</p>
		</div>
	{/if}

	{#if $availableMonths.length > 0}
		<div class="month-picker">
			<button class="month-arrow" onclick={prevMonth} disabled={!hasPrev} aria-label="Previous month">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
			</button>
			<span class="month-label">{formatMonth($currentMonth)}</span>
			<button class="month-arrow" onclick={nextMonth} disabled={!hasNext} aria-label="Next month">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
			</button>
		</div>
	{/if}
</div>

{#if showStats}
	<GardenStats entries={$entries} onclose={() => (showStats = false)} />
{/if}

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
	.btn-icon {
		padding: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-plant-btn {
		display: flex;
		align-items: center;
		gap: 6px;
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

	.month-picker {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		pointer-events: auto;
	}
	.phase-day .month-picker {
		background: rgba(0, 0, 0, 0.05);
	}
	.phase-dawn .month-picker {
		background: rgba(100, 60, 20, 0.08);
	}

	.month-label {
		font-size: 14px;
		font-weight: 300;
		letter-spacing: 1px;
		color: rgba(255, 255, 255, 0.8);
		min-width: 140px;
		text-align: center;
		user-select: none;
	}
	.phase-day .month-label {
		color: rgba(40, 60, 40, 0.65);
	}
	.phase-dawn .month-label {
		color: rgba(100, 60, 30, 0.7);
	}

	.month-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: rgba(255, 255, 255, 0.6);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s, color 0.2s;
	}
	.month-arrow:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.9);
	}
	.month-arrow:disabled {
		opacity: 0.25;
		cursor: default;
	}
	.phase-day .month-arrow {
		color: rgba(40, 60, 40, 0.5);
	}
	.phase-day .month-arrow:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(40, 60, 40, 0.8);
	}
	.phase-dawn .month-arrow {
		color: rgba(100, 60, 30, 0.5);
	}
	.phase-dawn .month-arrow:hover:not(:disabled) {
		background: rgba(100, 60, 20, 0.1);
		color: rgba(100, 60, 30, 0.8);
	}

	.editor-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		background: var(--ui-overlay);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	@media (max-width: 600px) {
		.top-bar {
			padding: 14px 16px;
		}
		.site-name {
			font-size: 16px;
			letter-spacing: 1px;
		}
		.controls {
			gap: 4px;
		}
		.hide-mobile {
			display: none;
		}
		.plant-label {
			display: none;
		}
		.btn-plant-btn {
			padding: 8px;
		}
		.month-picker {
			bottom: 16px;
			padding: 6px 12px;
			gap: 8px;
		}
		.month-label {
			font-size: 12px;
			min-width: 110px;
		}
		.welcome p {
			font-size: 20px;
			letter-spacing: 2px;
		}
	}
</style>
