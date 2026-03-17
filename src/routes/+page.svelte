<script lang="ts">
	import GardenCanvas from '$lib/components/GardenCanvas.svelte';
	import FlowerReveal from '$lib/components/FlowerReveal.svelte';
	import JournalEditor from '$lib/components/JournalEditor.svelte';
	import LoginDialog from '$lib/components/LoginDialog.svelte';
	import GardenStats from '$lib/components/GardenStats.svelte';
	import { entries, isAdmin, cursorDefault, cursorPointer, currentMonth, availableMonths, monthEntries, titleWaveTrigger, STARRED_MONTH, selectedFlower, pendingDeepLink } from '$lib/stores/garden.js';
	import { page } from '$app/stores';
	import { updateDocumentPhase, type TimePhase } from '$lib/engine/TimeOfDay.js';
	import { initSolarTimes } from '$lib/engine/SolarTimes.js';
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types.js';
	import type { MoodVector } from '$lib/types.js';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	const ownerName = env.PUBLIC_OWNER_NAME || 'hikari';
	const isOriginal = env.PUBLIC_ORIGINAL === 'true';
	const showHelpIcon = env.PUBLIC_SHOW_HELP === 'true';
	const debugEnabled = env.PUBLIC_DEBUG === 'true';

	// Phase for greeting text. data-phase on <html> (set in app.html inline script
	// + updated here) drives all CSS vars via app.css selectors.
	let phase = $state<TimePhase>('night');

	onMount(() => {
		phase = updateDocumentPhase();
		console.log('[theme:onMount] phase=' + phase + ' html.dataset.phase=' + document.documentElement.dataset.phase);
		// Fetch IP-based solar times; when resolved, re-update phase
		initSolarTimes(() => { phase = updateDocumentPhase(); });
		// Re-check phase every minute for natural transitions
		const interval = setInterval(() => { phase = updateDocumentPhase(); }, 60000);
		return () => clearInterval(interval);
	});

	// Returning visitor greeting
	function getWelcomeMessage(): string {
		if (typeof window === 'undefined') return `welcome to ${ownerName}'s garden`;
		const lastVisit = localStorage.getItem('hikari-last-visit');
		const now = Date.now();
		// Store current visit for next time
		setTimeout(() => localStorage.setItem('hikari-last-visit', String(now)), 5000);
		if (!lastVisit) return `welcome to ${ownerName}'s garden`;
		const days = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
		if (days < 0.25) return `welcome back to ${ownerName}'s garden`;
		if (days < 3) return `welcome back to ${ownerName}'s garden`;
		if (days < 14) return `the garden missed you`;
		if (days < 60) return `the flowers have been waiting`;
		return `so much has grown since you were last here`;
	}
	const welcomeMessage = getWelcomeMessage();

	let { data }: { data: PageData } = $props();

	let showLogin = $state(false);
	let showEditor = $state(false);
	let showWelcome = $state(true);
	let showStats = $state(false);
	let showHelp = $state(false);
	let helpStep = $state(0);
	let gardenCanvas: GardenCanvas;

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

	// Handle ?flower= deep link
	let deepLinked = false;
	$effect(() => {
		const flowerId = $page.url.searchParams.get('flower');
		if (!flowerId || deepLinked) return;
		const all = $entries;
		if (all.length === 0) return;
		const target = all.find((e) => e.id === flowerId);
		if (target) {
			deepLinked = true;
			showWelcome = false;
			// Switch to the flower's month so it's in the garden
			currentMonth.set(target.date.slice(0, 7));
			// Tell GardenCanvas to center + open this flower after it loads
			pendingDeepLink.set(target.id);
			// Clean the URL
			history.replaceState({}, '', '/');
		}
	});

	// "On This Day" memory — show if entry was planted 1+ years ago today
	let onThisDay = $state<{ entry: import('$lib/types.js').JournalEntry; yearsAgo: number } | null>(null);
	$effect(() => {
		const all = $entries;
		if (all.length === 0) return;
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hikari-otd-dismissed')) return;
		const ownerTz = env.PUBLIC_OWNER_TIMEZONE || 'America/Toronto';
		const ownerToday = new Date().toLocaleDateString('en-CA', { timeZone: ownerTz });
		const todaySuffix = ownerToday.slice(4); // "-MM-DD"
		const thisYear = ownerToday.slice(0, 4);
		for (const e of all) {
			if (e.date.endsWith(todaySuffix) && e.date.slice(0, 4) !== thisYear) {
				const years = parseInt(thisYear) - parseInt(e.date.slice(0, 4));
				if (years >= 1) {
					onThisDay = { entry: e, yearsAgo: years };
					break;
				}
			}
		}
	});

	function dismissOnThisDay() {
		onThisDay = null;
		sessionStorage.setItem('hikari-otd-dismissed', '1');
	}

	function visitOnThisDay() {
		if (!onThisDay) return;
		currentMonth.set(onThisDay.entry.date.slice(0, 7));
		selectedFlower.set(onThisDay.entry);
		onThisDay = null;
		sessionStorage.setItem('hikari-otd-dismissed', '1');
	}

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
		if (ym === STARRED_MONTH) return 'favourites';
		const [y, m] = ym.split('-');
		const d = new Date(parseInt(y), parseInt(m) - 1);
		return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	let hasStarred = $derived($entries.some((e) => e.isStarred));
	let monthDir = $state(1);

	function prevMonth() {
		monthDir = -1;
		if ($currentMonth === STARRED_MONTH) {
			const months = $availableMonths;
			if (months.length > 0) currentMonth.set(months[months.length - 1]);
			return;
		}
		const months = $availableMonths;
		const idx = months.indexOf($currentMonth);
		if (idx > 0) currentMonth.set(months[idx - 1]);
	}

	function nextMonth() {
		monthDir = 1;
		if ($currentMonth === STARRED_MONTH) return;
		const months = $availableMonths;
		const idx = months.indexOf($currentMonth);
		if (idx < months.length - 1) {
			currentMonth.set(months[idx + 1]);
		} else if (hasStarred) {
			currentMonth.set(STARRED_MONTH);
		}
	}

	let hasPrev = $derived($currentMonth === STARRED_MONTH ? $availableMonths.length > 0 : $availableMonths.indexOf($currentMonth) > 0);
	let hasNext = $derived($currentMonth !== STARRED_MONTH && ($availableMonths.indexOf($currentMonth) < $availableMonths.length - 1 || hasStarred));

	// When entries load, ensure currentMonth is valid (default to latest month with entries)
	$effect(() => {
		const months = $availableMonths;
		if ($currentMonth === STARRED_MONTH) return;
		if (months.length > 0 && !months.includes($currentMonth)) {
			currentMonth.set(months[months.length - 1]);
		}
	});

	let greeting = $derived(phase === 'dawn' ? 'good morning' : phase === 'day' ? 'good afternoon' : phase === 'dusk' ? 'good evening' : 'goodnight');
	let pageTitle = $derived(`${greeting}, ${ownerName}'s garden`);

	async function handleLogout() {
		await fetch('/api/logout', { method: 'POST' });
		isAdmin.set(false);
	}

	// ─── Debug Menu (Ctrl+Shift+D) ───
	let showDebug = $state(false);
	let timelapseDate = $state<string | null>(null);

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (debugEnabled && e.ctrlKey && e.shiftKey && e.key === 'D') {
			e.preventDefault();
			showDebug = !showDebug;
		}
	}

	function getEngine() {
		return gardenCanvas?.getEngine?.() ?? null;
	}

	// Wire up timelapse and ceremony text callbacks once engine is ready
	$effect(() => {
		const check = () => {
			const eng = getEngine();
			if (eng) {
				eng.onTimelapseDate = (d: string | null) => { timelapseDate = d; };
			} else {
				setTimeout(check, 500);
			}
		};
		check();
	});

</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<GardenCanvas bind:this={gardenCanvas} />
<FlowerReveal />

{#if showWelcome}
	<div class="welcome" transition:fade={{ duration: 1200 }}>
		<p in:fly={{ y: -20, duration: 1000, delay: 300 }}>{welcomeMessage}</p>
	</div>
{/if}

<!-- Floating UI -->
<div class="ui-overlay" style="--cursor-pointer:{$cursorPointer}">
	<div class="top-bar">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<h1 class="site-name" onclick={handleTitleClick}>hikari.garden</h1>

		<div class="controls">
			{#if showHelpIcon}
				<button class="btn btn-ghost btn-icon" onclick={() => (showHelp = true)} aria-label="What is this?"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>
			{/if}
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
			<span class="month-label">
				{#key $currentMonth}
					<span class="month-text" in:fly={{ x: monthDir * 30, duration: 250, delay: 100 }} out:fly={{ x: monthDir * -30, duration: 150 }}>
						{#if $currentMonth === STARRED_MONTH}
							<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" style="vertical-align:-2px;margin-right:4px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
						{/if}
						{formatMonth($currentMonth)}
					</span>
				{/key}
		</span>
			<button class="month-arrow" onclick={nextMonth} disabled={!hasNext} aria-label="Next month">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
			</button>
		</div>
	{/if}
</div>

{#if showStats}
	<GardenStats entries={$entries} onclose={() => (showStats = false)} isAdmin={$isAdmin} ownerName={env.PUBLIC_OWNER_NAME || 'hikari'} />
{/if}

{#if showLogin}
	<LoginDialog onclose={() => (showLogin = false)} />
{/if}

{#if showEditor}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="editor-overlay" style="cursor:{$cursorDefault}" transition:fade={{ duration: 200 }} onclick={() => (showEditor = false)}>
		<div class="editor-wrap" onclick={(e) => e.stopPropagation()}>
			<JournalEditor onsubmit={handleSubmit} oncancel={() => (showEditor = false)} />
		</div>
	</div>
{/if}

{#if showHelp}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="help-overlay" transition:fade={{ duration: 200 }} onclick={() => { showHelp = false; helpStep = 0; }}>
		<div class="help-card" onclick={(e) => e.stopPropagation()}>
			<button class="help-close" onclick={() => { showHelp = false; helpStep = 0; }}>&times;</button>

			<div class="help-content">
			{#key helpStep}
				<div class="help-step" in:fade={{ duration: 250, delay: 150 }} out:fade={{ duration: 150 }}>
					{#if helpStep === 0}
						<div class="help-illustration">
							<img src="/help/1.png" alt="" class="help-img" />
						</div>
						<h2 class="help-title">welcome to {ownerName}'s garden</h2>
						<p class="help-text">a living journal where every entry plants a unique pixel flower. each one grows from a moment, shaped by how you felt that day.</p>
					{:else if helpStep === 1}
						<div class="help-illustration">
							<img src="/help/2.png" alt="" class="help-img" />
						</div>
						<h2 class="help-title">feelings become flowers</h2>
						<p class="help-text">five mood axes shape each flower's petals, colors, and height. joy bends the petals one way, fog another. no two flowers are the same.</p>
					{:else}
						<div class="help-illustration">
							<img src="/help/3.png" alt="" class="help-img" />
						</div>
						<h2 class="help-title">it breathes with you</h2>
						<p class="help-text">the garden shifts with the time of day and mirrors the weather outside. click any flower to read the entry that grew it.</p>
						<a class="help-cta" href="https://github.com/Expl0dingCat/hikari.garden" target="_blank" rel="noopener noreferrer">
							<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
							become a gardener
						</a>
					{/if}
				</div>
			{/key}
			</div>

			<div class="help-footer">
				<div class="help-dots">
					{#each [0, 1, 2] as i}
						<button
							class="help-dot"
							class:active={helpStep === i}
							onclick={() => (helpStep = i)}
							aria-label="Step {i + 1}"
						></button>
					{/each}
				</div>
				<div class="help-nav">
					{#if helpStep > 0}
						<button class="help-back" onclick={() => (helpStep--)}>back</button>
					{/if}
					{#if helpStep < 2}
						<button class="help-next" onclick={() => (helpStep++)}>continue</button>
					{:else}
						<button class="help-next" onclick={() => { showHelp = false; helpStep = 0; }}>enter</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if onThisDay}
	<div class="on-this-day" transition:fly={{ y: 30, duration: 400 }}>
		<span class="otd-text">
			{onThisDay.yearsAgo === 1 ? 'one year' : `${onThisDay.yearsAgo} years`} ago today, you planted {onThisDay.entry.flowerName}
		</span>
		<button class="otd-visit" onclick={visitOnThisDay}>visit</button>
		<button class="otd-close" onclick={dismissOnThisDay}>&times;</button>
	</div>
{/if}

{#if timelapseDate}
	<div class="timelapse-date" transition:fade={{ duration: 200 }}>
		{new Date(timelapseDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
	</div>
{/if}

{#if debugEnabled && showDebug}
	<div class="debug-panel" transition:fly={{ x: 200, duration: 200 }}>
		<div class="debug-title">debug effects</div>
		<div class="debug-hint">Ctrl+Shift+D to toggle</div>
		<div class="debug-buttons">
			<button onclick={() => getEngine()?.triggerTitleWave()}>title wave</button>
			<button onclick={() => getEngine()?.debugPetalRain()}>petal rain</button>
			<button onclick={() => getEngine()?.debugMidnightBloom()}>midnight bloom</button>
			<button onclick={() => getEngine()?.debugMilestone()}>confetti</button>
			<button onclick={() => getEngine()?.debugRainRipple()}>rain ripple</button>
			<button onclick={() => getEngine()?.debugRainbow()}>rainbow</button>
			<button onclick={() => getEngine()?.debugStarMode()}>star mode</button>
			<button onclick={() => getEngine()?.debugAnniversary()}>anniversary glow</button>
			<button onclick={() => getEngine()?.debugWindGust()}>wind gust</button>
			<button onclick={() => getEngine()?.debugDew()}>morning dew</button>

			<button onclick={() => getEngine()?.startTimelapse()}>timelapse start</button>
			<button onclick={() => getEngine()?.stopTimelapse()}>timelapse stop</button>
			<button onclick={() => { const url = getEngine()?.exportImage(); if (url) { const a = document.createElement('a'); a.href = url; a.download = 'garden.png'; a.click(); } }}>export PNG</button>
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
		color: var(--overlay-text);
		text-shadow: var(--overlay-text-shadow);
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
		background: var(--overlay-btn-bg);
		color: var(--overlay-text);
		cursor: var(--cursor-pointer, pointer);
		backdrop-filter: blur(8px);
		transition: background 0.2s;
	}

	.btn:hover {
		background: var(--overlay-btn-hover);
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
		background: var(--overlay-btn-ghost-hover);
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
		color: var(--overlay-empty);
		letter-spacing: 1px;
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
		color: var(--overlay-welcome);
		text-shadow: var(--overlay-welcome-shadow);
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
		background: var(--overlay-month-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		pointer-events: auto;
	}

	.month-label {
		font-size: 14px;
		font-weight: 300;
		letter-spacing: 1px;
		color: var(--overlay-month-text);
		min-width: 140px;
		text-align: center;
		user-select: none;
		position: relative;
		overflow: hidden;
		height: 1.4em;
	}
	.month-text {
		display: inline-block;
		position: absolute;
		left: 0;
		right: 0;
	}

	.month-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--overlay-arrow);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s, color 0.2s;
	}
	.month-arrow:hover:not(:disabled) {
		background: var(--overlay-arrow-hover-bg);
		color: var(--overlay-arrow-hover);
	}
	.month-arrow:disabled {
		opacity: 0.25;
		cursor: default;
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
	.editor-wrap {
		max-width: 100%;
		max-height: 100%;
	}

	.on-this-day {
		position: fixed;
		bottom: 80px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 15;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: 12px;
		background: var(--overlay-month-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		font-size: 13px;
		color: var(--overlay-text);
		white-space: nowrap;
		pointer-events: auto;
	}
	.otd-text {
		letter-spacing: 0.3px;
	}
	.otd-visit {
		padding: 4px 12px;
		border: none;
		border-radius: 6px;
		background: var(--overlay-btn-bg);
		color: var(--overlay-text);
		font-size: 12px;
		cursor: pointer;
		transition: background 0.2s;
	}
	.otd-visit:hover {
		background: var(--overlay-btn-hover);
	}
	.otd-close {
		background: none;
		border: none;
		color: var(--overlay-text);
		font-size: 16px;
		cursor: pointer;
		padding: 0 4px;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	.otd-close:hover {
		opacity: 1;
	}

	@media (max-width: 600px) {
		.on-this-day {
			bottom: 60px;
			font-size: 11px;
			padding: 8px 12px;
			gap: 6px;
		}
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

	.help-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: var(--ui-overlay);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.help-card {
		position: relative;
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 12px 12px 16px;
		max-width: 400px;
		width: 100%;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
		overflow: hidden;
	}

	.help-close {
		position: absolute;
		top: 12px;
		right: 14px;
		background: none;
		border: none;
		font-size: 20px;
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		line-height: 1;
		padding: 4px 6px;
		transition: color 0.2s;
		z-index: 1;
	}
	.help-close:hover {
		color: var(--ui-text);
	}

	.help-content {
		height: 400px;
		position: relative;
		overflow: hidden;
	}

	.help-step {
		display: flex;
		flex-direction: column;
		position: absolute;
		inset: 0;
	}

	.help-illustration {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 230px;
		flex-shrink: 0;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		margin-bottom: 20px;
	}

	.help-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.help-title {
		font-family: 'Darumadrop One', cursive;
		font-weight: 400;
		font-size: 22px;
		letter-spacing: 1.5px;
		color: var(--ui-text);
		margin: 0 20px 12px 8px;
	}

	.help-text {
		font-family: 'Mona Sans', sans-serif;
		font-size: 14px;
		line-height: 1.7;
		color: var(--ui-text-soft, var(--ui-text));
		letter-spacing: 0.2px;
		margin: 0 20px 0 8px;
	}

	.help-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 8px;
	}

	.help-dots {
		display: flex;
		gap: 6px;
	}

	.help-dot {
		width: 8px;
		height: 8px;
		border-radius: 4px;
		border: none;
		background: var(--ui-bar-bg, rgba(255,255,255,0.12));
		cursor: var(--cursor-pointer, pointer);
		padding: 0;
		transition: background 0.2s, width 0.3s;
	}
	.help-dot.active {
		width: 24px;
		background: var(--ui-text-muted);
	}

	.help-nav {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.help-back {
		font-family: 'Mona Sans', sans-serif;
		font-size: 13px;
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		background: none;
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		letter-spacing: 0.3px;
		transition: color 0.2s;
	}
	.help-back:hover {
		color: var(--ui-text);
	}

	.help-next {
		font-family: 'Mona Sans', sans-serif;
		font-size: 13px;
		padding: 8px 20px;
		border: none;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.12);
		color: var(--ui-text);
		cursor: var(--cursor-pointer, pointer);
		letter-spacing: 0.3px;
		transition: background 0.2s;
	}
	.help-next:hover {
		background: rgba(255, 255, 255, 0.18);
	}

	.help-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 12px 20px 0 8px;
		font-family: 'Mona Sans', sans-serif;
		font-size: 12px;
		color: var(--ui-text-soft);
		text-decoration: none;
		letter-spacing: 0.3px;
		transition: color 0.2s;
	}
	.help-cta:hover {
		color: var(--ui-text);
	}

	.timelapse-date {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 50;
		font-family: 'Darumadrop One', cursive;
		font-size: 20px;
		letter-spacing: 2px;
		color: rgba(255, 255, 255, 0.7);
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
		pointer-events: none;
	}

	.debug-panel {
		position: fixed;
		top: 60px;
		right: 12px;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 14px;
		width: 180px;
		backdrop-filter: blur(10px);
	}

	.debug-title {
		font-family: 'Darumadrop One', cursive;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
		letter-spacing: 1px;
		margin-bottom: 4px;
	}

	.debug-hint {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.35);
		margin-bottom: 10px;
	}

	.debug-buttons {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.debug-buttons button {
		font-family: 'Darumadrop One', cursive;
		font-size: 11px;
		letter-spacing: 0.5px;
		padding: 5px 10px;
		border: none;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.75);
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}
	.debug-buttons button:hover {
		background: rgba(255, 255, 255, 0.18);
		color: #fff;
	}

	@media (max-width: 600px) {
		.help-card {
			padding: 10px 10px 14px;
			border-radius: 16px;
		}
		.help-content {
			height: 320px;
		}
		.help-illustration {
			height: 150px;
			margin-bottom: 14px;
		}
		.help-title {
			font-size: 19px;
			margin-bottom: 8px;
		}
		.help-text {
			font-size: 13px;
			line-height: 1.6;
		}
	}
</style>
