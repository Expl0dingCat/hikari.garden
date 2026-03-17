<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cursorDefault } from '$lib/stores/garden.js';
	import { getUIThemeStyle } from '$lib/engine/TimeOfDay.js';
	import type { JournalEntry } from '$lib/types.js';

	interface Props {
		entries: JournalEntry[];
		onclose: () => void;
		isAdmin: boolean;
		ownerName: string;
	}

	let { entries, onclose, isAdmin, ownerName }: Props = $props();

	let heading = $derived(isAdmin ? 'your garden' : `${ownerName}'s garden`);

	const themeStyle = getUIThemeStyle();

	let stats = $derived.by(() => {
		if (entries.length === 0) return null;

		// Brightest day (highest joy)
		let brightest = entries[0];
		let quietest = entries[0];
		let tenderest = entries[0];
		for (const e of entries) {
			if (e.mood.joy > brightest.mood.joy) brightest = e;
			if (e.mood.energy < quietest.mood.energy) quietest = e;
			if (e.mood.tenderness > tenderest.mood.tenderness) tenderest = e;
		}

		// Streaks
		const dates = new Set(entries.map((e) => e.date));
		const sortedDates = [...dates].sort();

		// Current streak (consecutive days ending today or most recent entry)
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

		let currentStreak = 0;
		let checkDate = new Date(todayStr + 'T00:00:00');
		// If today has no entry, start from the most recent entry date
		if (!dates.has(todayStr) && sortedDates.length > 0) {
			checkDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
		}
		while (true) {
			const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
			if (dates.has(ds)) {
				currentStreak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}

		// Longest streak
		let longestStreak = 0;
		let run = 0;
		let prevDate: Date | null = null;
		for (const ds of sortedDates) {
			const d = new Date(ds + 'T00:00:00');
			if (prevDate) {
				const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
				if (diff === 1) {
					run++;
				} else {
					run = 1;
				}
			} else {
				run = 1;
			}
			if (run > longestStreak) longestStreak = run;
			prevDate = d;
		}

		// Total smells
		let totalSmells = 0;
		for (const e of entries) totalSmells += e.smells || 0;

		return {
			total: entries.length,
			brightest,
			quietest,
			tenderest,
			currentStreak,
			longestStreak,
			totalSmells
		};
	});

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" style="{themeStyle};cursor:{$cursorDefault}" transition:fade={{ duration: 200 }} onclick={onclose}>
	<div class="card" onclick={(e) => e.stopPropagation()}>
		<h2>{heading}</h2>

		{#if stats}
			<div class="stat-list">
				<div class="stat">
					<span class="stat-value">{stats.total}</span>
					<span class="stat-label">flowers planted</span>
				</div>

				<div class="divider"></div>

				<div class="stat">
					<span class="stat-label">brightest</span>
					<span class="stat-entry">{stats.brightest.title || 'untitled'}</span>
					<span class="stat-date">{formatDate(stats.brightest.date)}</span>
				</div>

				<div class="stat">
					<span class="stat-label">quietest</span>
					<span class="stat-entry">{stats.quietest.title || 'untitled'}</span>
					<span class="stat-date">{formatDate(stats.quietest.date)}</span>
				</div>

				<div class="stat">
					<span class="stat-label">most tender</span>
					<span class="stat-entry">{stats.tenderest.title || 'untitled'}</span>
					<span class="stat-date">{formatDate(stats.tenderest.date)}</span>
				</div>

				<div class="divider"></div>

				<div class="stat row">
					<span class="stat-label">current streak</span>
					<span class="stat-value-sm">{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}</span>
				</div>

				<div class="stat row">
					<span class="stat-label">longest streak</span>
					<span class="stat-value-sm">{stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}</span>
				</div>

				{#if stats.totalSmells > 0}
					<div class="stat row">
						<span class="stat-label">times smelled</span>
						<span class="stat-value-sm">{stats.totalSmells}</span>
					</div>
				{/if}
			</div>
		{:else}
			<p class="empty">no flowers yet</p>
		{/if}
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

	.card {
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 32px 28px;
		width: 300px;
		max-width: 90vw;
		text-align: center;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
	}

	h2 {
		font-family: 'Darumadrop One', cursive;
		font-weight: 400;
		font-size: 20px;
		margin: 0 0 24px;
		letter-spacing: 2px;
		color: var(--ui-text-soft);
	}

	.stat-list {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat.row {
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.stat-value {
		font-family: 'Darumadrop One', cursive;
		font-size: 36px;
		font-weight: 400;
		letter-spacing: 2px;
		color: var(--ui-text);
	}

	.stat-value-sm {
		font-size: 14px;
		font-weight: 400;
		color: var(--ui-text);
		letter-spacing: 0.5px;
	}

	.stat-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1.5px;
		color: var(--ui-text-muted);
	}

	.stat-entry {
		font-size: 14px;
		color: var(--ui-text-soft);
		font-style: italic;
	}

	.stat-date {
		font-size: 11px;
		color: var(--ui-text-muted);
	}

	.divider {
		height: 1px;
		background: var(--ui-card-border);
		margin: 4px 0;
	}

	.empty {
		font-size: 14px;
		color: var(--ui-text-muted);
		font-style: italic;
	}
</style>
