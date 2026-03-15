<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { GardenEngine } from '$lib/engine/GardenEngine.js';
	import { entries, selectedFlower } from '$lib/stores/garden.js';
	import type { JournalEntry } from '$lib/types.js';

	let canvas: HTMLCanvasElement;
	let engine: GardenEngine;
	let unsub: (() => void) | null = null;
	let handleResize: (() => void) | null = null;

	let tooltipEntry = $state<JournalEntry | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	let todayPins = $state<{ entry: JournalEntry; x: number; y: number }[]>([]);
	let latestPin = $state<{ entry: JournalEntry; x: number; y: number } | null>(null);

	function formatTooltipDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	onMount(() => {
		engine = new GardenEngine();
		engine.init(canvas).then(() => {
			engine.onFlowerClick = (entry: JournalEntry) => {
				selectedFlower.set(entry);
			};

			engine.onFlowerHover = (entry, sx, sy) => {
				tooltipEntry = entry;
				tooltipX = sx;
				tooltipY = sy;
			};

			engine.onTodayFlowers = (positions) => {
				todayPins = positions;
			};

			engine.onLatestFlower = (pos) => {
				latestPin = pos;
			};

			// Wait one frame so the WebGL context is fully ready before loading textures
			requestAnimationFrame(() => {
				unsub = entries.subscribe((e) => {
					engine.loadEntries(e);
				});
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

	{#each todayPins as pin (pin.entry.id)}
		{#if !latestPin || pin.entry.id !== latestPin.entry.id}
			<div
				class="pin today-pin"
				style="left: {pin.x}px; top: {pin.y}px"
			>
				today
			</div>
		{/if}
	{/each}

	{#if latestPin}
		<div
			class="pin latest-pin"
			style="left: {latestPin.x}px; top: {latestPin.y}px"
		>
			latest
		</div>
	{/if}

	{#if tooltipEntry}
		<div
			class="flower-tooltip"
			style="left: {tooltipX}px; top: {tooltipY}px"
		>
			{formatTooltipDate(tooltipEntry.date)}
		</div>
	{/if}
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

	.flower-tooltip {
		position: absolute;
		transform: translate(-50%, -100%);
		margin-top: -12px;
		padding: 3px 10px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.55);
		color: rgba(255, 255, 255, 0.85);
		font-size: 11px;
		letter-spacing: 0.4px;
		white-space: nowrap;
		pointer-events: none;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.pin {
		position: absolute;
		transform: translate(-50%, -100%);
		margin-top: -6px;
		padding: 2px 8px;
		border-radius: 5px;
		font-size: 10px;
		letter-spacing: 0.8px;
		white-space: nowrap;
		pointer-events: none;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.today-pin {
		background: rgba(0, 0, 0, 0.4);
		color: rgba(255, 255, 255, 0.8);
	}

	.latest-pin {
		background: rgba(255, 200, 60, 0.25);
		color: rgba(255, 220, 100, 0.95);
		border: 1px solid rgba(255, 200, 60, 0.3);
	}
</style>
