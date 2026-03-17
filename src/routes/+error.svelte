<script lang="ts">
	import { page } from '$app/stores';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { env } from '$env/dynamic/public';

	const ownerName = env.PUBLIC_OWNER_NAME || 'hikari';
	let canvas: HTMLCanvasElement;

	$effect(() => {
		if (!canvas) return;
		// Generate a sad, wilted-looking flower with low mood
		const mood = { joy: 0.1, energy: 0.1, tenderness: 0.3, clarity: 0.15, hope: 0.1 };
		const dna = generateFlowerDNA(mood, 404);
		const rendered = renderFlower(dna);
		const w = rendered.width;
		const h = rendered.height;

		canvas.width = w * 4;
		canvas.height = h * 4;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;
		const tmp = document.createElement('canvas');
		tmp.width = w;
		tmp.height = h;
		const tmpCtx = tmp.getContext('2d')!;
		tmpCtx.putImageData(new ImageData(new Uint8ClampedArray(rendered.pixels), w, h), 0, 0);
		ctx.drawImage(tmp, 0, 0, w * 4, h * 4);
	});
</script>

<div class="error-page">
	<canvas bind:this={canvas} class="flower"></canvas>
	<h1>{$page.status}</h1>
	<p>this flower doesn't exist</p>
	<a href="/">return to {ownerName}'s garden</a>
</div>

<style>
	.error-page {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--ui-overlay, #1a1a2e);
		color: var(--ui-text, #ccc);
		font-family: 'Darumadrop One', cursive;
		gap: 12px;
	}

	.flower {
		image-rendering: pixelated;
		height: 120px;
		width: auto;
		opacity: 0.5;
		filter: grayscale(0.6);
		margin-bottom: 8px;
	}

	h1 {
		font-size: 48px;
		font-weight: 400;
		letter-spacing: 4px;
		color: var(--ui-text, #ccc);
		margin: 0;
	}

	p {
		font-size: 18px;
		color: var(--ui-text-muted, #888);
		letter-spacing: 1px;
	}

	a {
		margin-top: 12px;
		font-size: 14px;
		color: var(--ui-text-soft, #aaa);
		text-decoration: none;
		letter-spacing: 0.5px;
		transition: color 0.2s;
	}
	a:hover {
		color: var(--ui-text, #ccc);
	}
</style>
