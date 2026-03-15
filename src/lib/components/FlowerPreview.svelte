<script lang="ts">
	import { onMount } from 'svelte';
	import type { MoodVector } from '$lib/types.js';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { hashString } from '$lib/generation/SeededRandom.js';
	import { generateFlowerName } from '$lib/generation/NameGenerator.js';

	interface Props {
		mood: MoodVector;
		previewSeed?: string;
	}

	let { mood, previewSeed = 'preview' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let flowerName = $state('');

	const SCALE = 5;

	$effect(() => {
		if (!canvas) return;
		const seed = hashString(previewSeed + 'preview');
		const dna = generateFlowerDNA(mood, seed);
		const rendered = renderFlower(dna);
		flowerName = generateFlowerName(mood, seed);

		canvas.width = rendered.width * SCALE;
		canvas.height = rendered.height * SCALE;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;

		const tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = rendered.width;
		tmpCanvas.height = rendered.height;
		const tmpCtx = tmpCanvas.getContext('2d')!;
		const pixelData = new Uint8ClampedArray(rendered.pixels.length);
		pixelData.set(rendered.pixels);
		const imageData = new ImageData(pixelData as unknown as Uint8ClampedArray<ArrayBuffer>, rendered.width, rendered.height);
		tmpCtx.putImageData(imageData, 0, 0);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(tmpCanvas, 0, 0, canvas.width, canvas.height);
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
		gap: 10px;
	}

	canvas {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.name {
		font-size: 13px;
		font-weight: 300;
		letter-spacing: 1px;
		color: var(--ui-text-soft, rgba(0,0,0,0.6));
		text-align: center;
	}
</style>
