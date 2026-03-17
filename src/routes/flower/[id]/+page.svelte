<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		goto(`/?flower=${data.flowerId}`, { replaceState: true });
	});
</script>

<svelte:head>
	<title>{data.title} — hikari.garden</title>
	<meta name="description" content={data.description} />

	<meta property="og:title" content={data.title} />
	<meta property="og:description" content={data.description} />
	<meta property="og:type" content="article" />
	{#if data.image}
		<meta property="og:image" content={data.image} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={data.image} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	<meta name="twitter:title" content={data.title} />
	<meta name="twitter:description" content={data.description} />
</svelte:head>
