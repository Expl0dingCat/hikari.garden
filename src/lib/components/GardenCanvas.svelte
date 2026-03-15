<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { GardenEngine } from '$lib/engine/GardenEngine.js';
	import { entries, selectedFlower } from '$lib/stores/garden.js';
	import type { JournalEntry } from '$lib/types.js';

	let canvas: HTMLCanvasElement;
	let engine: GardenEngine;
	let unsub: (() => void) | null = null;
	let handleResize: (() => void) | null = null;

	onMount(() => {
		engine = new GardenEngine();
		engine.init(canvas).then(() => {
			engine.onFlowerClick = (entry: JournalEntry) => {
				selectedFlower.set(entry);
			};

			unsub = entries.subscribe((e) => {
				engine.loadEntries(e);
			});
		});

		handleResize = () => engine?.resize();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize!);
			unsub?.();
		};
	});

	onDestroy(() => {
		engine?.destroy();
	});
</script>

<div class="garden-wrapper">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.garden-wrapper {
		position: fixed;
		inset: 0;
		z-index: 0;
	}
	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
