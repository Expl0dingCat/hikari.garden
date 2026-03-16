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

		// Crop to non-transparent bounding box
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

		canvas.width = w * SCALE;
		canvas.height = croppedH * SCALE;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;

		const tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = w;
		tmpCanvas.height = h;
		const tmpCtx = tmpCanvas.getContext('2d')!;
		const pixelData = new Uint8ClampedArray(px.length);
		pixelData.set(px);
		const imageData = new ImageData(pixelData as unknown as Uint8ClampedArray<ArrayBuffer>, w, h);
		tmpCtx.putImageData(imageData, 0, 0);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(
			tmpCanvas,
			0, topY, w, croppedH,
			0, 0, canvas.width, canvas.height
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
