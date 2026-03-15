<script lang="ts">
	import { selectedFlower, cursorDefault, cursorPointer } from '$lib/stores/garden.js';
	import { fade, fly } from 'svelte/transition';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { getUIThemeStyle } from '$lib/engine/TimeOfDay.js';
	import { marked } from 'marked';

	let visible = $derived($selectedFlower !== null);
	let entry = $derived($selectedFlower);
	let displayedText = $state('');
	let glowColor = $state('rgba(255,255,255,0.3)');
	let petalColor = $state('#aaaaaa');
	let glowTop = $state('40%');
	let revealTimer: ReturnType<typeof setTimeout> | null = null;
	let showTags = $state(false);
	let flowerCanvas: HTMLCanvasElement;
	let flowerSideEl: HTMLDivElement;
	let textSideHeight = $state('auto');

	const themeStyle = getUIThemeStyle();
	const FLOWER_SCALE = 5;

	const weatherSvgs: Record<string, string> = {
		sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
		'cloud-sun': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M20 12h2"/><path d="M17.66 4.93l-1.41 1.41"/><path d="M2 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M18 10a4 4 0 00-7.46-2"/><path d="M17.5 19a4.5 4.5 0 10-7.42-4.97A3.5 3.5 0 006 17.5 3.5 3.5 0 009.5 21h8a3 3 0 000-6z" fill="currentColor" opacity="0.15"/><path d="M17.5 19a4.5 4.5 0 10-7.42-4.97A3.5 3.5 0 006 17.5 3.5 3.5 0 009.5 21h8a3 3 0 000-6z"/></svg>',
		cloud: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>',
		rain: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 13V5a4 4 0 00-8 0v.2A5 5 0 004 10a5 5 0 005 5h7a4 4 0 000-8z"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="17" x2="12" y2="19"/><line x1="16" y1="19" x2="16" y2="21"/></svg>',
		snow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="8" y1="20" x2="8" y2="20.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="12" y1="22" x2="12" y2="22.01"/><line x1="16" y1="16" x2="16" y2="16.01"/><line x1="16" y1="20" x2="16" y2="20.01"/></svg>',
		storm: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',
	};

	function getWeatherSvg(icon: string): string {
		return weatherSvgs[icon] || weatherSvgs['cloud-sun'] || icon;
	}

	marked.setOptions({ breaks: true, gfm: true });

	let renderedHtml = $derived(displayedText ? marked.parse(displayedText) as string : '');

	const moodAxes = [
		{ key: 'joy' as const, label: 'Joy', left: '#78909c', right: '#ffd54f' },
		{ key: 'energy' as const, label: 'Energy', left: '#b0bec5', right: '#ff7043' },
		{ key: 'tenderness' as const, label: 'Tenderness', left: '#90a4ae', right: '#f48fb1' },
		{ key: 'clarity' as const, label: 'Clarity', left: '#78909c', right: '#4fc3f7' },
		{ key: 'hope' as const, label: 'Hope', left: '#616161', right: '#ffcc02' },
	];

	$effect(() => {
		const currentEntry = entry;
		if (currentEntry) {
			if (flowerCanvas) {
				const dna = generateFlowerDNA(currentEntry.mood, currentEntry.flowerSeed);
				const rendered = renderFlower(dna);
				const w = rendered.width;
				const h = rendered.height;
				const px = rendered.pixels;

				let topY = 0;
				let bottomY = h - 1;
				for (let y = 0; y < h; y++) {
					let hasPixel = false;
					for (let x = 0; x < w; x++) {
						if (px[(y * w + x) * 4 + 3] > 0) { hasPixel = true; break; }
					}
					if (hasPixel) { topY = y; break; }
				}
				for (let y = h - 1; y >= topY; y--) {
					let hasPixel = false;
					for (let x = 0; x < w; x++) {
						if (px[(y * w + x) * 4 + 3] > 0) { hasPixel = true; break; }
					}
					if (hasPixel) { bottomY = y; break; }
				}

				topY = Math.max(0, topY - 1);
				const croppedH = bottomY - topY + 2;

				const headCenter = Math.round((croppedH * 0.35));
				glowTop = `${(headCenter / croppedH) * 100}%`;

				flowerCanvas.width = w * FLOWER_SCALE;
				flowerCanvas.height = croppedH * FLOWER_SCALE;
				const ctx = flowerCanvas.getContext('2d')!;
				ctx.imageSmoothingEnabled = false;

				const tmp = document.createElement('canvas');
				tmp.width = w;
				tmp.height = h;
				const tmpCtx = tmp.getContext('2d')!;
				const pixelData = new Uint8ClampedArray(px.length);
				pixelData.set(px);
				const imageData = new ImageData(
					pixelData as unknown as Uint8ClampedArray<ArrayBuffer>,
					w,
					h
				);
				tmpCtx.putImageData(imageData, 0, 0);
				ctx.clearRect(0, 0, flowerCanvas.width, flowerCanvas.height);
				ctx.drawImage(
					tmp,
					0, topY, w, croppedH,
					0, 0, flowerCanvas.width, flowerCanvas.height
				);

				const [c1] = dna.petalColors;
				petalColor = c1;
				glowColor = `${c1}30`;

				requestAnimationFrame(() => {
					if (flowerSideEl) {
						textSideHeight = `${flowerSideEl.offsetHeight}px`;
					}
				});
			}

			displayedText = '';
			showTags = false;
			revealTimer = setTimeout(() => {
				displayedText = currentEntry.text;
				setTimeout(() => { showTags = true; }, 500);
			}, 300);
		}
		return () => {
			if (revealTimer) clearTimeout(revealTimer);
		};
	});

	function close() {
		selectedFlower.set(null);
		displayedText = '';
		showTags = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function formatDateLine(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function relativeDate(dateStr: string): string | null {
		const today = new Date();
		const entryDate = new Date(dateStr + 'T00:00:00');
		const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const diffMs = todayMidnight.getTime() - entryDate.getTime();
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'yesterday';
		if (diffDays >= 2 && diffDays <= 7) return `${diffDays} days ago`;
		return null;
	}

	function formatTimeEST(createdAt: number): string {
		const t = new Date(createdAt);
		return t.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'America/New_York'
		});
	}

	function formatTimeLocal(createdAt: number): string {
		const t = new Date(createdAt);
		const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const isEST = localTz === 'America/New_York';
		if (isEST) return '';
		const localTime = t.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
		const shortTz = localTz.split('/').pop()?.replace(/_/g, ' ') || 'Local';
		return `${localTime} ${shortTz}`;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible && entry}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" style="{themeStyle};cursor:{$cursorDefault};--link-color:{petalColor};--cursor-pointer:{$cursorPointer}" transition:fade={{ duration: 300 }} onclick={close}>
		<div class="reveal-card" transition:fly={{ y: 30, duration: 400 }} onclick={(e) => e.stopPropagation()}>
			<div class="top-bar">
				<span class="top-date">{formatDateLine(entry.date)}</span>
				<div class="top-meta">
					{#if relativeDate(entry.date)}
						<span class="meta-tag">{relativeDate(entry.date)}</span>
					{/if}
					<span class="meta-tag time-tag" title={formatTimeLocal(entry.createdAt) || 'EST'}>{formatTimeEST(entry.createdAt)}</span>
					{#if entry.weather}
						<span class="meta-tag weather-tag">{@html getWeatherSvg(entry.weather.icon)} {entry.weather.temp}°C</span>
					{/if}
				</div>
				<button class="close-btn" onclick={close} aria-label="Close">&times;</button>
			</div>

			<div class="card-body">
				<div class="flower-side" bind:this={flowerSideEl}>
					<div class="flower-display">
						<div class="flower-glow" style="background: {glowColor}; top: {glowTop}"></div>
						<canvas
							bind:this={flowerCanvas}
							class="flower-canvas"
						></canvas>
					</div>
					<div class="flower-name">{entry.flowerName}</div>

					<div class="mood-bars">
						{#each moodAxes as axis}
							<div class="mood-row">
								<span class="mood-label">{axis.label}</span>
								<div class="mood-track">
									<div
										class="mood-fill"
										style="width: {entry.mood[axis.key] * 100}%; background: linear-gradient(to right, {axis.left}, {axis.right})"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="text-side" style="height: {textSideHeight}">
					{#if entry.title}
						<h2 class="entry-title">{entry.title}</h2>
					{/if}
					{#if renderedHtml}
						<div class="journal-text" transition:fade={{ duration: 600 }}>
							{@html renderedHtml}
						</div>
					{/if}

					{#if showTags && entry.tags && entry.tags.length > 0}
						<div class="tags" transition:fade={{ duration: 400 }}>
							{#each entry.tags as tag}
								<span class="tag">{tag}</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--ui-overlay);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.reveal-card {
		position: relative;
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 16px 24px 28px;
		max-width: 900px;
		width: 94%;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
	}

	.top-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 20px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--ui-divider);
	}

	.top-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.top-date {
		font-size: 15px;
		color: var(--ui-text-soft, var(--ui-text-muted));
		letter-spacing: 0.3px;
		margin-right: auto;
	}

	.meta-tag {
		font-size: 12px;
		padding: 3px 9px;
		border-radius: 6px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		letter-spacing: 0.3px;
		white-space: nowrap;
	}

	.time-tag {
		cursor: help;
	}

	.weather-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.weather-tag :global(svg) {
		vertical-align: middle;
		opacity: 0.8;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		cursor: inherit;
		color: var(--ui-text-muted);
		transition: color 0.2s;
		line-height: 1;
		padding: 2px 4px;
		flex-shrink: 0;
	}
	.close-btn:hover {
		color: var(--ui-text);
	}

	.card-body {
		display: flex;
		gap: 36px;
		align-items: flex-start;
	}

	@media (max-width: 600px) {
		.card-body {
			flex-direction: column;
		}
		.flower-side {
			align-items: center;
		}
	}

	.flower-side {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		width: 260px;
		min-height: 0;
	}

	.flower-display {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		margin-bottom: 8px;
	}

	.flower-glow {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 60px;
		height: 60px;
		border-radius: 50%;
		filter: blur(18px);
		pointer-events: none;
	}

	.flower-canvas {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		position: relative;
		z-index: 1;
	}

	.flower-name {
		font-size: 20px;
		font-weight: 300;
		letter-spacing: 1px;
		text-align: center;
		color: var(--ui-text);
		margin-bottom: 14px;
	}

	.mood-bars {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mood-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mood-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1.2px;
		color: var(--ui-text-muted);
		width: 80px;
		text-align: right;
		flex-shrink: 0;
	}

	.mood-track {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--ui-bar-bg);
		overflow: hidden;
	}

	.mood-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.6s ease;
	}

	.text-side {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.entry-title {
		font-size: 26px;
		font-weight: 400;
		letter-spacing: 0.5px;
		color: var(--ui-text);
		margin: 0 0 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--ui-divider);
		flex-shrink: 0;
	}

	.journal-text {
		font-family: inherit;
		font-size: 16px;
		line-height: 1.65;
		color: var(--ui-text-soft);
		flex: 1;
		overflow-y: auto;
		overflow-wrap: break-word;
		padding: 4px 0 16px;
		scrollbar-width: none;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 0%,
			black 12px,
			black calc(100% - 24px),
			transparent 100%
		);
		mask-image: linear-gradient(
			to bottom,
			transparent 0%,
			black 12px,
			black calc(100% - 24px),
			transparent 100%
		);
	}
	.journal-text::-webkit-scrollbar {
		display: none;
	}

	.journal-text :global(p) {
		margin: 0 0 0.7em;
	}
	.journal-text :global(p:last-child) {
		margin-bottom: 0;
	}
	.journal-text :global(h1), .journal-text :global(h2), .journal-text :global(h3) {
		color: var(--ui-text);
		margin: 1em 0 0.4em;
		font-weight: 500;
	}
	.journal-text :global(h1) { font-size: 1.3em; }
	.journal-text :global(h2) { font-size: 1.15em; }
	.journal-text :global(h3) { font-size: 1.05em; }
	.journal-text :global(strong) {
		font-weight: 600;
		color: var(--ui-text);
	}
	.journal-text :global(em) {
		font-style: italic;
	}
	.journal-text :global(a) {
		color: var(--link-color, var(--ui-accent, #5a9e60));
		text-decoration: underline;
		cursor: var(--cursor-pointer, pointer);
	}
	.journal-text :global(blockquote) {
		margin: 0.5em 0;
		padding-left: 12px;
		border-left: 2px solid var(--ui-divider);
		color: var(--ui-text-muted);
	}
	.journal-text :global(code) {
		font-size: 0.9em;
		padding: 1px 4px;
		border-radius: 3px;
		background: var(--ui-bar-bg, rgba(0,0,0,0.06));
	}
	.journal-text :global(ul), .journal-text :global(ol) {
		margin: 0.4em 0;
		padding-left: 1.5em;
	}
	.journal-text :global(hr) {
		border: none;
		border-top: 1px solid var(--ui-divider);
		margin: 1em 0;
	}


	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--ui-divider);
		flex-shrink: 0;
	}

	.tag {
		font-size: 12px;
		padding: 4px 14px;
		border-radius: 20px;
		background: var(--ui-tag);
		color: var(--ui-tag-text);
		letter-spacing: 0.3px;
	}
</style>
