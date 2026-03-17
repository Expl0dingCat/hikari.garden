<script lang="ts">
	import type { Song } from '$lib/types.js';

	interface Props {
		value: Song | undefined;
		onchange: (song: Song | undefined) => void;
		disabled?: boolean;
	}

	let { value, onchange, disabled = false }: Props = $props();

	let query = $state('');
	let results = $state<Song[]>([]);
	let open = $state(false);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let containerEl: HTMLDivElement;

	async function search(q: string) {
		if (q.trim().length < 2) {
			results = [];
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				const data = await res.json();
				results = data.tracks || [];
			}
		} catch {
			results = [];
		} finally {
			loading = false;
		}
	}

	function handleInput() {
		open = true;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => search(query), 350);
	}

	function select(song: Song) {
		onchange(song);
		query = '';
		results = [];
		open = false;
	}

	function clear() {
		onchange(undefined);
		query = '';
		results = [];
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="song-picker" bind:this={containerEl}>
	{#if value}
		<div class="selected-song">
			<img src={value.albumArt} alt="" class="album-art" />
			<div class="song-info">
				<span class="song-title">{value.title}</span>
				<span class="song-artist">{value.artist}</span>
			</div>
			{#if !disabled}
				<button class="clear-btn" onclick={clear} aria-label="Remove song">&times;</button>
			{/if}
		</div>
	{:else}
		<div class="search-wrap">
			<svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
			</svg>
			<input
				bind:value={query}
				oninput={handleInput}
				onfocus={() => { if (query.trim().length >= 2) open = true; }}
				placeholder="search for a song..."
				class="search-input"
				{disabled}
			/>
			{#if loading}
				<svg class="spinner" viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>
			{/if}
		</div>

		{#if open && results.length > 0}
			<div class="dropdown">
				{#each results as track}
					<button class="result" onclick={() => select(track)}>
						<img src={track.albumArt} alt="" class="result-art" />
						<div class="result-info">
							<span class="result-title">{track.title}</span>
							<span class="result-artist">{track.artist}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.song-picker {
		position: relative;
	}

	.selected-song {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 10px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
	}

	.album-art {
		width: 40px;
		height: 40px;
		border-radius: 6px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.song-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.song-title {
		font-size: 13px;
		color: var(--ui-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.song-artist {
		font-size: 11px;
		color: var(--ui-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.clear-btn {
		background: none;
		border: none;
		font-size: 18px;
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		padding: 2px 6px;
		line-height: 1;
		flex-shrink: 0;
		transition: color 0.2s;
	}
	.clear-btn:hover {
		color: var(--ui-text);
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border: 1px solid var(--ui-input-border);
		border-radius: 10px;
		background: transparent;
		transition: border-color 0.2s;
	}
	.search-wrap:focus-within {
		border-color: var(--ui-input-focus);
	}

	.search-icon {
		flex-shrink: 0;
		opacity: 0.4;
	}

	.search-input {
		flex: 1;
		font-family: inherit;
		font-size: 13px;
		border: none;
		background: transparent;
		color: var(--ui-text);
		outline: none;
		min-width: 0;
	}
	.search-input::placeholder {
		color: var(--ui-text-muted);
	}
	.search-input:disabled {
		opacity: 0.5;
	}

	.spinner {
		flex-shrink: 0;
		animation: spin 0.8s linear infinite;
		opacity: 0.5;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.dropdown {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 4px);
		z-index: 20;
		background: var(--ui-card, #1a1a2e);
		border: 1px solid var(--ui-card-border);
		border-radius: 12px;
		box-shadow: var(--ui-shadow);
		overflow: hidden;
		max-height: 300px;
		overflow-y: auto;
		scrollbar-width: none;
	}
	.dropdown::-webkit-scrollbar {
		display: none;
	}

	.result {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: transparent;
		cursor: var(--cursor-pointer, pointer);
		text-align: left;
		font-family: inherit;
		transition: background 0.15s;
	}
	.result:hover {
		background: var(--ui-bar-bg, rgba(255,255,255,0.06));
	}

	.result-art {
		width: 36px;
		height: 36px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.result-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.result-title {
		font-size: 13px;
		color: var(--ui-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-artist {
		font-size: 11px;
		color: var(--ui-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 700px) {
		.dropdown {
			position: fixed;
			left: 16px;
			right: 16px;
			bottom: 70px;
			top: auto;
			max-height: 40vh;
		}
	}
</style>
