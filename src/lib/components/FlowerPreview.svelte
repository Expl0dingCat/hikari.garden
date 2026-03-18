<script lang="ts">
	import type { MoodVector } from '$lib/types.js';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { generateFlowerName } from '$lib/generation/NameGenerator.js';

	interface Props {
		mood: MoodVector;
		flowerSeed: number;
	}

	let { mood, flowerSeed }: Props = $props();

	let canvas: HTMLCanvasElement;
	let flowerName = $state('');

	const SCALE = 5;

	$effect(() => {
		if (!canvas) return;
		const dna = generateFlowerDNA(mood, flowerSeed);
		const rendered = renderFlower(dna);
		flowerName = generateFlowerName(mood, flowerSeed);

		const w = rendered.width;
		const h = rendered.height;
		const px = rendered.pixels;

		// Find bounding box of non-transparent pixels
		let minX = w, maxX = 0, minY = h, maxY = 0;
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				if (px[(y * w + x) * 4 + 3] > 0) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		const spriteW = maxX - minX + 1;
		const spriteH = maxY - minY + 1;

		// Use full canvas size, center the sprite
		const side = Math.max(w, h);
		canvas.width = side * SCALE;
		canvas.height = side * SCALE;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = w;
		tmpCanvas.height = h;
		const tmpCtx = tmpCanvas.getContext('2d')!;
		const pixelData = new Uint8ClampedArray(px.length);
		pixelData.set(px);
		const imageData = new ImageData(pixelData as unknown as Uint8ClampedArray<ArrayBuffer>, w, h);
		tmpCtx.putImageData(imageData, 0, 0);

		// Draw cropped sprite centered in square canvas
		const dx = Math.round((side - spriteW) / 2) * SCALE;
		const dy = Math.round((side - spriteH) / 2) * SCALE;
		ctx.drawImage(
			tmpCanvas,
			minX, minY, spriteW, spriteH,
			dx, dy, spriteW * SCALE, spriteH * SCALE
		);
	});
</script>

<div class="preview">
	<canvas bind:this={canvas}></canvas>
	{#if flowerName}
		<div class="name">{flowerName}</div>
	{/if}
</div>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	canvas {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.name {
		font-size: 16px;
		font-weight: 300;
		letter-spacing: 1px;
		color: var(--ui-text-soft, rgba(0,0,0,0.6));
		text-align: center;
	}
</style>
