<script lang="ts">
	import { page } from '$app/stores';
	import { getUIThemeStyle } from '$lib/engine/TimeOfDay.js';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { env } from '$env/dynamic/public';
	import type { MoodVector } from '$lib/types.js';

	const ownerName = env.PUBLIC_OWNER_NAME || 'hikari';
	const themeStyle = getUIThemeStyle();

	let canvas: HTMLCanvasElement;
	let valid = $state(true);
	let mood = $state<MoodVector | null>(null);
	let linkCopied = $state(false);

	function decodeMood(code: string): MoodVector | null {
		if (code.length !== 10) return null;
		const vals: number[] = [];
		for (let i = 0; i < 5; i++) {
			const v = parseInt(code.slice(i * 2, i * 2 + 2), 16);
			if (isNaN(v) || v > 99) return null;
			vals.push(v / 99);
		}
		return { joy: vals[0], energy: vals[1], tenderness: vals[2], clarity: vals[3], hope: vals[4] };
	}

	const code = $page.params.code ?? '';
	const decoded = decodeMood(code);
	if (decoded) {
		mood = decoded;
	} else {
		valid = false;
	}

	$effect(() => {
		if (!canvas || !mood) return;
		const seed = parseInt(code, 16) % 100000;
		const dna = generateFlowerDNA(mood, seed);
		const rendered = renderFlower(dna);
		const w = rendered.width;
		const h = rendered.height;

		canvas.width = w * 5;
		canvas.height = h * 5;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;
		const tmp = document.createElement('canvas');
		tmp.width = w;
		tmp.height = h;
		tmp.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rendered.pixels), w, h), 0, 0);
		ctx.drawImage(tmp, 0, 0, w * 5, h * 5);
	});

	function copyLink() {
		navigator.clipboard.writeText(window.location.href);
		linkCopied = true;
		setTimeout(() => { linkCopied = false; }, 2000);
	}

	function moodLabel(val: number): string {
		if (val > 0.7) return 'high';
		if (val > 0.4) return 'mid';
		return 'low';
	}
</script>

<svelte:head>
	<title>a seed from {ownerName}'s garden</title>
</svelte:head>

<div class="seed-page" style={themeStyle}>
	{#if valid && mood}
		<p class="subtitle">a seed from {ownerName}'s garden</p>
		<div class="flower-box">
			<canvas bind:this={canvas} class="flower"></canvas>
		</div>
		<div class="mood-grid">
			<span class="mood-item">joy: {moodLabel(mood.joy)}</span>
			<span class="mood-item">energy: {moodLabel(mood.energy)}</span>
			<span class="mood-item">tender: {moodLabel(mood.tenderness)}</span>
			<span class="mood-item">clarity: {moodLabel(mood.clarity)}</span>
			<span class="mood-item">hope: {moodLabel(mood.hope)}</span>
		</div>
		<div class="actions">
			<button class="action-btn" onclick={copyLink}>
				{linkCopied ? 'copied!' : 'share this seed'}
			</button>
			<a href="/" class="action-link">visit the garden</a>
		</div>
	{:else}
		<h1>invalid seed</h1>
		<p class="subtitle">this seed couldn't grow</p>
		<a href="/" class="action-link">return to {ownerName}'s garden</a>
	{/if}
</div>

<style>
	.seed-page {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--ui-overlay, #1a1a2e);
		color: var(--ui-text, #ccc);
		font-family: 'Darumadrop One', cursive;
		gap: 16px;
		padding: 24px;
	}

	.subtitle {
		font-size: 16px;
		color: var(--ui-text-muted, #888);
		letter-spacing: 1px;
	}

	.flower-box {
		width: 180px;
		height: 180px;
		border-radius: 16px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.flower {
		image-rendering: pixelated;
		height: 160px;
		width: auto;
	}

	h1 {
		font-size: 36px;
		font-weight: 400;
		letter-spacing: 3px;
		margin: 0;
	}

	.mood-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		justify-content: center;
		max-width: 300px;
	}

	.mood-item {
		font-size: 12px;
		color: var(--ui-text-muted, #888);
		letter-spacing: 0.5px;
	}

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		margin-top: 8px;
	}

	.action-btn {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--ui-text-soft, #aaa);
		font-family: 'Darumadrop One', cursive;
		font-size: 14px;
		padding: 8px 20px;
		border-radius: 10px;
		cursor: pointer;
		letter-spacing: 0.5px;
		transition: background 0.2s;
	}
	.action-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.action-link {
		font-size: 13px;
		color: var(--ui-text-muted, #888);
		text-decoration: none;
		letter-spacing: 0.5px;
		transition: color 0.2s;
	}
	.action-link:hover {
		color: var(--ui-text, #ccc);
	}
</style>
