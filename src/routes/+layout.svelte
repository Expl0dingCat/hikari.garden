<script lang="ts">
	import { isAdmin } from '$lib/stores/garden.js';
	import type { LayoutData } from './$types.js';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Sync server-side auth state
	$effect(() => {
		isAdmin.set(data.isAdmin);
	});
</script>

<svelte:head>
	<title>hikari.garden</title>
	<meta name="description" content="A garden of feelings, grown one day at a time." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Darumadrop+One&family=Mona+Sans:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
</svelte:head>

{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: 'Darumadrop One', cursive;
		overflow: hidden;
		background: #1a1a2e;
		color: #333;
	}

	:global(::selection) {
		background: rgba(200, 200, 255, 0.3);
	}
</style>
