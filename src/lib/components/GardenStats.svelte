<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cursorDefault, cursorPointer } from '$lib/stores/garden.js';
	import { getUIThemeStyle } from '$lib/engine/TimeOfDay.js';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { selectedFlower, currentMonth } from '$lib/stores/garden.js';
	import type { JournalEntry } from '$lib/types.js';

	interface Props {
		entries: JournalEntry[];
		onclose: () => void;
		isAdmin: boolean;
		ownerName: string;
	}

	let { entries, onclose, isAdmin, ownerName }: Props = $props();

	function goToFlower(entry: JournalEntry) {
		currentMonth.set(entry.date.slice(0, 7));
		selectedFlower.set(entry);
		onclose();
	}

	let heading = $derived(isAdmin ? 'your garden' : `${ownerName}'s garden`);

	const themeStyle = getUIThemeStyle();

	let flowerCanvas: HTMLCanvasElement;

	let stats = $derived.by(() => {
		if (entries.length === 0) return null;

		let brightest = entries[0];
		let quietest = entries[0];
		let tenderest = entries[0];
		for (const e of entries) {
			if (e.mood.joy > brightest.mood.joy) brightest = e;
			if (e.mood.energy < quietest.mood.energy) quietest = e;
			if (e.mood.tenderness > tenderest.mood.tenderness) tenderest = e;
		}

		const dates = new Set(entries.map((e) => e.date));
		const sortedDates = [...dates].sort();

		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

		let currentStreak = 0;
		let checkDate = new Date(todayStr + 'T00:00:00');
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

		let totalSmells = 0;
		for (const e of entries) totalSmells += e.smells || 0;

		// First entry date
		const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;

		// Average mood
		const avgMood = {
			joy: entries.reduce((s, e) => s + e.mood.joy, 0) / entries.length,
			energy: entries.reduce((s, e) => s + e.mood.energy, 0) / entries.length,
			tenderness: entries.reduce((s, e) => s + e.mood.tenderness, 0) / entries.length,
			clarity: entries.reduce((s, e) => s + e.mood.clarity, 0) / entries.length,
			hope: entries.reduce((s, e) => s + e.mood.hope, 0) / entries.length,
		};

		return {
			total: entries.length,
			brightest,
			quietest,
			tenderest,
			currentStreak,
			longestStreak,
			totalSmells,
			firstDate,
			avgMood
		};
	});

	const moodAxes = [
		{ key: 'joy' as const, label: 'joy', left: '#6b7b8d', right: '#ffd166' },
		{ key: 'energy' as const, label: 'energy', left: '#8b9dc3', right: '#ff6b6b' },
		{ key: 'tenderness' as const, label: 'tender', left: '#7a8b99', right: '#ee88aa' },
		{ key: 'clarity' as const, label: 'clarity', left: '#8899aa', right: '#88ddff' },
		{ key: 'hope' as const, label: 'hope', left: '#7b8a7b', right: '#77dd77' }
	];

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatDateShort(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Render the average mood flower (cropped to flower head, fit in square)
	$effect(() => {
		if (flowerCanvas && stats) {
			const dna = generateFlowerDNA(stats.avgMood, 42);
			const rendered = renderFlower(dna);
			const w = rendered.width;
			const h = rendered.height;
			const px = rendered.pixels;

			// Find bounding box of non-transparent pixels
			let topY = h, bottomY = 0, leftX = w, rightX = 0;
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					if (px[(y * w + x) * 4 + 3] > 0) {
						if (y < topY) topY = y;
						if (y > bottomY) bottomY = y;
						if (x < leftX) leftX = x;
						if (x > rightX) rightX = x;
					}
				}
			}

			// Crop to top ~60% to focus on flower head (cut stem)
			const fullH = bottomY - topY + 1;
			const cropH = Math.ceil(fullH * 0.6);
			const cropBottom = topY + cropH - 1;
			const cropW = rightX - leftX + 1;

			// Make it square (use the larger dimension)
			const size = Math.max(cropW, cropH);
			const padX = Math.floor((size - cropW) / 2);
			const padY = Math.floor((size - cropH) / 2);

			flowerCanvas.width = size;
			flowerCanvas.height = size;
			const ctx = flowerCanvas.getContext('2d')!;
			const tmp = document.createElement('canvas');
			tmp.width = w; tmp.height = h;
			const tmpCtx = tmp.getContext('2d')!;
			tmpCtx.putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0);
			ctx.drawImage(tmp, leftX, topY, cropW, cropBottom - topY + 1, padX, padY, cropW, cropBottom - topY + 1);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" style="{themeStyle};cursor:{$cursorDefault};--cursor-pointer:{$cursorPointer}" transition:fade={{ duration: 200 }} onclick={onclose}>
	<div class="card" transition:fly={{ y: 20, duration: 300 }} onclick={(e) => e.stopPropagation()}>
		<button class="close-btn" onclick={onclose}>&times;</button>

		{#if stats}
			<div class="hero">
				<div class="hero-flower-box">
					<canvas bind:this={flowerCanvas} class="hero-flower"></canvas>
				</div>
				<div class="hero-text">
					<h2>{heading}</h2>
					<span class="hero-count">{stats.total}</span>
					<span class="hero-label">flowers planted</span>
					{#if stats.firstDate}<span class="hero-since">since {formatDateShort(stats.firstDate)}</span>{/if}
				</div>
			</div>

			<div class="mood-section">
				<span class="section-label">average mood</span>
				<div class="mood-bars">
					{#each moodAxes as axis}
						<div class="mood-row">
							<span class="mood-label">{axis.label}</span>
							<div class="mood-track">
								<div
									class="mood-fill"
									style="width: {stats.avgMood[axis.key] * 100}%; background: linear-gradient(to right, {axis.left}, {axis.right})"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="divider"></div>

			<div class="highlights">
				<button class="highlight" onclick={() => goToFlower(stats.brightest)}>
					<span class="highlight-icon">☀</span>
					<div class="highlight-text">
						<span class="highlight-label">brightest day</span>
						<span class="highlight-value">{stats.brightest.title || stats.brightest.flowerName}</span>
					</div>
					<span class="highlight-date">{formatDateShort(stats.brightest.date)}</span>
				</button>
				<button class="highlight" onclick={() => goToFlower(stats.quietest)}>
					<span class="highlight-icon">☁</span>
					<div class="highlight-text">
						<span class="highlight-label">quietest day</span>
						<span class="highlight-value">{stats.quietest.title || stats.quietest.flowerName}</span>
					</div>
					<span class="highlight-date">{formatDateShort(stats.quietest.date)}</span>
				</button>
				<button class="highlight" onclick={() => goToFlower(stats.tenderest)}>
					<span class="highlight-icon">♡</span>
					<div class="highlight-text">
						<span class="highlight-label">most tender</span>
						<span class="highlight-value">{stats.tenderest.title || stats.tenderest.flowerName}</span>
					</div>
					<span class="highlight-date">{formatDateShort(stats.tenderest.date)}</span>
				</button>
			</div>

			<div class="divider"></div>

			<div class="streak-row">
				<div class="streak">
					<span class="streak-value">{stats.currentStreak}</span>
					<span class="streak-label">day streak</span>
				</div>
				<div class="streak">
					<span class="streak-value">{stats.longestStreak}</span>
					<span class="streak-label">longest</span>
				</div>
				{#if stats.totalSmells > 0}
					<div class="streak">
						<span class="streak-value">{stats.totalSmells}</span>
						<span class="streak-label">smells</span>
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<h2>{heading}</h2>
				<p>no flowers yet</p>
			</div>
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
		padding: 24px;
		background: var(--ui-overlay);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.card {
		position: relative;
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 28px 24px 24px;
		width: 340px;
		max-width: 100%;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
	}

	.close-btn {
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
	}
	.close-btn:hover {
		color: var(--ui-text);
	}

	.hero {
		display: flex;
		align-items: stretch;
		gap: 16px;
		margin-bottom: 24px;
	}

	.hero-flower-box {
		width: 110px;
		min-height: 110px;
		flex-shrink: 0;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-flower {
		image-rendering: pixelated;
		width: 80%;
		height: 80%;
		object-fit: contain;
	}

	.hero-text {
		display: flex;
		flex-direction: column;
	}

	.hero-text h2 {
		font-family: 'Darumadrop One', cursive;
		font-weight: 400;
		font-size: 18px;
		letter-spacing: 1.5px;
		color: var(--ui-text-soft);
		margin: 0 0 4px;
	}

	.hero-count {
		font-family: 'Darumadrop One', cursive;
		font-size: 40px;
		font-weight: 400;
		letter-spacing: 2px;
		color: var(--ui-text);
		line-height: 1;
	}

	.hero-label {
		font-family: 'Darumadrop One', cursive;
		font-size: 14px;
		font-weight: 400;
		color: var(--ui-text-soft);
		letter-spacing: 1px;
		margin-top: 6px;
	}

	.hero-since {
		font-family: 'Darumadrop One', cursive;
		font-size: 13px;
		font-weight: 400;
		color: var(--ui-text-soft);
		letter-spacing: 0.5px;
		margin-top: 2px;
	}

	.mood-section {
		margin-bottom: 20px;
	}

	.section-label {
		font-family: 'Darumadrop One', cursive;
		font-size: 12px;
		letter-spacing: 1.5px;
		color: var(--ui-text-muted);
		display: block;
		margin-bottom: 10px;
	}

	.mood-bars {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.mood-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mood-label {
		width: 50px;
		font-family: 'Darumadrop One', cursive;
		font-size: 12px;
		letter-spacing: 1px;
		color: var(--ui-text-muted);
		text-align: right;
		flex-shrink: 0;
	}

	.mood-track {
		flex: 1;
		height: 4px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		border-radius: 2px;
		overflow: hidden;
	}

	.mood-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.8s ease-out;
	}

	.divider {
		height: 1px;
		background: var(--ui-card-border);
		margin: 16px 0;
	}

	.highlights {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.highlight {
		display: flex;
		align-items: center;
		gap: 10px;
		background: none;
		border: none;
		padding: 6px 8px;
		margin: -6px -8px;
		border-radius: 10px;
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		text-align: left;
		color: inherit;
		width: calc(100% + 16px);
	}
	.highlight:hover {
		background: var(--ui-bar-bg, rgba(255,255,255,0.06));
	}

	.highlight-icon {
		font-size: 14px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.06));
		flex-shrink: 0;
	}

	.highlight-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.highlight-label {
		font-family: 'Darumadrop One', cursive;
		font-size: 11px;
		letter-spacing: 1px;
		color: var(--ui-text-muted);
	}

	.highlight-value {
		font-family: 'Darumadrop One', cursive;
		font-size: 14px;
		color: var(--ui-text-soft);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.highlight-date {
		font-family: 'Darumadrop One', cursive;
		font-size: 12px;
		color: var(--ui-text-muted);
		flex-shrink: 0;
	}

	.streak-row {
		display: flex;
		justify-content: space-around;
		text-align: center;
	}

	.streak {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.streak-value {
		font-family: 'Darumadrop One', cursive;
		font-size: 24px;
		font-weight: 400;
		letter-spacing: 1px;
		color: var(--ui-text);
		line-height: 1;
	}

	.streak-label {
		font-family: 'Darumadrop One', cursive;
		font-size: 12px;
		letter-spacing: 1px;
		color: var(--ui-text-muted);
	}

	.empty-state {
		text-align: center;
	}

	.empty-state h2 {
		font-family: 'Darumadrop One', cursive;
		font-weight: 400;
		font-size: 20px;
		margin: 0 0 16px;
		letter-spacing: 2px;
		color: var(--ui-text-soft);
	}

	.empty-state p {
		font-family: 'Darumadrop One', cursive;
		font-size: 14px;
		color: var(--ui-text-muted);
	}

	@media (max-width: 600px) {
		.card {
			padding: 20px 18px 18px;
			border-radius: 16px;
		}
		.hero-count {
			font-size: 32px;
		}
	}
</style>
