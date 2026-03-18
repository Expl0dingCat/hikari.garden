<script lang="ts">
	import type { MoodVector, Song } from '$lib/types.js';
	import MoodSelector from './MoodSelector.svelte';
	import FlowerPreview from './FlowerPreview.svelte';
	import DatePicker from './DatePicker.svelte';
	import SongPicker from './SongPicker.svelte';
	import { cursorDefault, cursorPointer } from '$lib/stores/garden.js';
	import { hashString } from '$lib/generation/SeededRandom.js';
	import { env } from '$env/dynamic/public';

	import type { Weather } from '$lib/types.js';

	const OWNER_TZ = env.PUBLIC_OWNER_TIMEZONE || 'America/Toronto';

	type SubmitState = 'idle' | 'planting' | 'planted';

	interface Props {
		onsubmit: (data: { title: string; text: string; mood: MoodVector; date: string; tags: string[]; weather?: Weather; images?: string[]; song?: Song; flowerSeed?: number }) => Promise<void> | void;
		oncancel: () => void;
	}

	let { onsubmit, oncancel }: Props = $props();

	const DRAFT_KEY = 'hikari-draft';

	function loadDraft() {
		try {
			const raw = sessionStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch { return null; }
	}
	const draft = loadDraft();

	let title = $state(draft?.title || '');
	let text = $state(draft?.text || '');
	let date = $state(draft?.date || new Date().toLocaleDateString('en-CA', { timeZone: OWNER_TZ }));
	let tagInput = $state('');
	let tags = $state<string[]>(draft?.tags || []);
	let mood = $state<MoodVector>(draft?.mood || {
		joy: 0.5,
		energy: 0.5,
		tenderness: 0.5,
		clarity: 0.5,
		hope: 0.5
	});
	const flowerSeed = draft?.flowerSeed || hashString(crypto.randomUUID() + Date.now().toString());
	let submitState = $state<SubmitState>('idle');
	let locked = $derived(submitState !== 'idle');
	let song = $state<Song | undefined>(draft?.song || undefined);
	let weather = $state<Weather | undefined>(undefined);
	let imageFiles = $state<File[]>([]);
	let imagePreviews = $state<string[]>([]);
	let fileInput: HTMLInputElement;
	let mobileStep = $state(0);
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
		if (dx < 0 && mobileStep === 0 && text.trim()) mobileStep = 1;
		else if (dx > 0 && mobileStep === 1) mobileStep = 0;
	}

	$effect(() => {
		const d = { title, text, date, tags, mood, song, flowerSeed };
		if (title || text || tags.length > 0 || song) {
			try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
		}
	});

	function clearDraft() {
		try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
	}

	$effect(() => {
		(async () => {
			try {
				const geo = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
				if (!geo.ok) return;
				const geoData = await geo.json();
				const lat = geoData.latitude, lon = geoData.longitude;

				const res = await fetch(
					`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
					{ signal: AbortSignal.timeout(5000) }
				);
				if (!res.ok) return;
				const data = await res.json();
				const temp = Math.round(data.current.temperature_2m);
				const code = data.current.weather_code as number;
				const { icon, condition } = weatherCodeToInfo(code);
				weather = { temp, icon, condition };
			} catch {}
		})();
	});

	function weatherCodeToInfo(code: number): { icon: string; condition: string } {
		if (code === 0) return { icon: 'sun', condition: 'Clear' };
		if (code <= 3) return { icon: 'cloud-sun', condition: 'Partly Cloudy' };
		if (code <= 48) return { icon: 'cloud', condition: 'Cloudy' };
		if (code <= 57) return { icon: 'rain', condition: 'Drizzle' };
		if (code <= 67) return { icon: 'rain', condition: 'Rain' };
		if (code <= 77) return { icon: 'snow', condition: 'Snow' };
		if (code <= 82) return { icon: 'rain', condition: 'Showers' };
		if (code <= 86) return { icon: 'snow', condition: 'Snow Showers' };
		if (code === 95) return { icon: 'storm', condition: 'Thunderstorm' };
		if (code <= 99) return { icon: 'storm', condition: 'Thunderstorm' };
		return { icon: 'cloud-sun', condition: 'Fair' };
	}

	function addTag() {
		const t = tagInput.trim();
		if (t && !tags.includes(t) && tags.length < 3) {
			tags = [...tags, t];
			tagInput = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function handleFiles(files: FileList | null) {
		if (!files) return;
		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			imageFiles = [...imageFiles, file];
			imagePreviews = [...imagePreviews, URL.createObjectURL(file)];
		}
	}

	function removeImage(index: number) {
		URL.revokeObjectURL(imagePreviews[index]);
		imageFiles = imageFiles.filter((_, i) => i !== index);
		imagePreviews = imagePreviews.filter((_, i) => i !== index);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		handleFiles(e.dataTransfer?.files ?? null);
	}

	async function uploadImages(): Promise<string[]> {
		if (imageFiles.length === 0) return [];
		const formData = new FormData();
		for (const file of imageFiles) {
			formData.append('images', file);
		}
		const res = await fetch('/api/images', { method: 'POST', body: formData });
		if (!res.ok) throw new Error('Failed to upload images');
		const data = await res.json();
		return data.filenames;
	}

	async function handleSubmit() {
		if (!text.trim() || locked) return;
		submitState = 'planting';
		try {
			const images = await uploadImages();
			await onsubmit({ title, text, mood, date, tags, weather, images: images.length > 0 ? images : undefined, song, flowerSeed });
			clearDraft();
			submitState = 'planted';
			setTimeout(() => oncancel(), 1200);
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to save entry');
			submitState = 'idle';
		}
	}
</script>

<div class="editor" style="cursor:{$cursorDefault};--cursor-pointer:{$cursorPointer}">
	<div class="top-bar">
		<input
			bind:value={title}
			placeholder="title for today..."
			class="title-input"
			class:mobile-hide={mobileStep === 1}
			maxlength={50}
			disabled={locked}
		/>
		<div class="top-meta">
			<DatePicker value={date} onchange={(d) => (date = d)} />
			{#if weather}
				<span class="meta-tag">{weather.condition} {weather.temp}°C</span>
			{/if}
		</div>
		<button class="close-btn" onclick={oncancel} aria-label="Close">&times;</button>
	</div>

	<div class="card-body">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="panels" style="--step:{mobileStep}" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
			<!-- Panel 1: Write -->
			<div class="panel panel-write">
				<textarea
					bind:value={text}
					placeholder="How are you feeling today? Write freely..."
					class="journal-textarea"
					rows={8}
					disabled={locked}
				></textarea>

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="image-upload"
					ondrop={handleDrop}
					ondragover={(e) => e.preventDefault()}
					onclick={() => fileInput.click()}
				>
					<input
						bind:this={fileInput}
						type="file"
						accept="image/*"
						multiple
						hidden
						onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
					/>
					{#if imagePreviews.length > 0}
						<div class="image-previews">
							{#each imagePreviews as src, i}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="image-thumb" onclick={(e) => { e.stopPropagation(); removeImage(i); }}>
									<img {src} alt="preview" />
									<span class="remove-img">&times;</span>
								</div>
							{/each}
						</div>
					{:else}
						<span class="upload-hint">drop images here or click to browse</span>
					{/if}
				</div>

				<div class="tag-area">
					<div class="tags">
						{#each tags as tag}
							<button class="tag" onclick={() => !locked && removeTag(tag)} disabled={locked}>
								{tag} &times;
							</button>
						{/each}
					</div>
					{#if !locked && tags.length < 3}
						<div class="tag-input-wrap">
							<input
								bind:value={tagInput}
								placeholder="add a tag..."
								class="tag-input"
								onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
							/>
							{#if tagInput.trim()}
								<button class="tag-add-btn" onclick={addTag} type="button" aria-label="Add tag">+</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>

		<!-- Panel 2: Flower & Details -->
			<div class="panel panel-flower">
				<div class="panel-flower-scroll">
					<div class="preview-section">
						<FlowerPreview {mood} {flowerSeed} />
					</div>

					<div class="mood-section">
						<MoodSelector bind:mood />
					</div>

					<SongPicker value={song} onchange={(s) => (song = s)} disabled={locked} />
				</div>
			</div>
		</div>
	</div>

	<!-- Desktop actions -->
	<div class="actions desktop-actions">
		<button class="btn-cancel" onclick={oncancel} disabled={locked}>cancel</button>
		<button class="btn-plant" class:planted={submitState === 'planted'} onclick={handleSubmit} disabled={!text.trim() || locked}>
			{#if submitState === 'planted'}
				<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8.5 6.5 12 13 4"/></svg>
				planted
			{:else if submitState === 'planting'}
				<svg class="spinner" viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>
				planting
			{:else}
				plant
			{/if}
		</button>
	</div>

	<!-- Mobile actions -->
	<div class="actions mobile-actions">
		{#if mobileStep === 0}
			<button class="btn-cancel" onclick={oncancel} disabled={locked}>cancel</button>
			<div class="step-dots">
				<span class="dot active"></span>
				<span class="dot"></span>
			</div>
			<button class="btn-next" onclick={() => (mobileStep = 1)} disabled={!text.trim()}>
				next
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
			</button>
		{:else}
			<button class="btn-back" onclick={() => (mobileStep = 0)}>
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
				back
			</button>
			<div class="step-dots">
				<span class="dot"></span>
				<span class="dot active"></span>
			</div>
			<button class="btn-plant" class:planted={submitState === 'planted'} onclick={handleSubmit} disabled={!text.trim() || locked}>
				{#if submitState === 'planted'}
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8.5 6.5 12 13 4"/></svg>
					planted
				{:else if submitState === 'planting'}
					<svg class="spinner" viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>
					planting
				{:else}
					plant
				{/if}
			</button>
		{/if}
	</div>
</div>

<style>
	.editor {
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 16px 24px 24px;
		width: 94%;
		min-width: 900px;
		max-width: 900px;
		max-height: 90vh;
		overflow: visible;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
		box-sizing: border-box;
	}

	.top-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 18px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--ui-divider);
	}

	.title-input {
		flex: 1;
		min-width: 0;
		font-family: inherit;
		font-size: 20px;
		font-weight: 400;
		letter-spacing: 0.5px;
		padding: 4px 0;
		border: none;
		background: transparent;
		color: var(--ui-text);
		outline: none;
	}
	.title-input::placeholder {
		color: var(--ui-text-muted);
		font-weight: 300;
	}

	.top-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	.meta-tag {
		font-size: 12px;
		padding: 3px 9px;
		border-radius: 6px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		letter-spacing: 0.3px;
		white-space: nowrap;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		cursor: var(--cursor-pointer, pointer);
		color: var(--ui-text-muted);
		transition: color 0.2s;
		line-height: 1;
		padding: 2px 6px;
		flex-shrink: 0;
	}
	.close-btn:hover {
		color: var(--ui-text);
	}

	/* ─── Desktop layout: two-column ─── */
	.card-body {
		min-height: 460px;
	}

	.panels {
		display: flex;
		gap: 28px;
		align-items: stretch;
		min-height: 460px;
	}

	.panel-flower {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		width: 240px;
		gap: 10px;
		order: -1;
	}

	.panel-flower-scroll {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.panel-write {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.preview-section {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 10px 8px 6px;
		background: var(--ui-bar-bg);
		border-radius: 14px;
		min-height: 240px;
	}

	.mood-section {
		border-radius: 14px;
		overflow: hidden;
	}

	.journal-textarea {
		font-family: inherit;
		font-size: 14px;
		line-height: 1.8;
		padding: 14px 16px;
		border: 1px solid var(--ui-input-border);
		border-radius: 12px;
		background: var(--ui-input);
		color: var(--ui-text);
		resize: vertical;
		outline: none;
		min-height: 120px;
		flex: 1;
		width: 100%;
		box-sizing: border-box;
		word-break: break-word;
		overflow-wrap: break-word;
		transition: border-color 0.2s;
	}
	.journal-textarea:focus {
		border-color: var(--ui-input-focus);
	}
	.journal-textarea::placeholder {
		color: var(--ui-text-muted);
	}

	.tag-area {
		display: flex;
		gap: 6px;
		align-items: center;
		overflow-x: auto;
		scrollbar-width: none;
		flex-shrink: 0;
	}
	.tag-area::-webkit-scrollbar {
		display: none;
	}

	.tags {
		display: contents;
	}

	.tag {
		font-size: 11px;
		padding: 4px 12px;
		border-radius: 20px;
		background: var(--ui-tag);
		color: var(--ui-tag-text);
		border: none;
		cursor: var(--cursor-pointer, pointer);
		font-family: inherit;
		transition: opacity 0.2s;
		letter-spacing: 0.3px;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.tag:hover {
		opacity: 0.7;
	}

	.tag-input {
		font-family: inherit;
		font-size: 12px;
		padding: 5px 10px;
		border: 1px solid var(--ui-input-border);
		border-radius: 8px;
		background: transparent;
		color: var(--ui-text);
		outline: none;
		width: 120px;
		flex-shrink: 0;
		transition: border-color 0.2s;
	}
	.tag-input-wrap .tag-input {
		border-radius: 8px 0 0 8px;
	}
	.tag-input:focus {
		border-color: var(--ui-input-focus);
	}
	.tag-input::placeholder {
		color: var(--ui-text-muted);
	}

	.tag-input-wrap {
		display: flex;
		align-items: center;
		gap: 0;
		flex-shrink: 0;
	}

	.tag-add-btn {
		width: 28px;
		height: 28px;
		border-radius: 0 8px 8px 0;
		border: 1px solid var(--ui-input-border);
		border-left: none;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		font-size: 16px;
		font-family: inherit;
		cursor: var(--cursor-pointer, pointer);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s, color 0.2s;
		flex-shrink: 0;
	}
	.tag-add-btn:hover {
		background: var(--ui-divider);
		color: var(--ui-text);
	}

	.image-upload {
		border: 1px dashed var(--ui-input-border);
		border-radius: 12px;
		padding: 12px;
		cursor: var(--cursor-pointer, pointer);
		transition: border-color 0.2s, background 0.2s;
		min-height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.image-upload:hover {
		border-color: var(--ui-input-focus);
		background: var(--ui-bar-bg);
	}

	.upload-hint {
		font-size: 12px;
		color: var(--ui-text-muted);
		letter-spacing: 0.3px;
	}

	.image-previews {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		width: 100%;
	}

	.image-thumb {
		position: relative;
		width: 64px;
		height: 64px;
		border-radius: 8px;
		overflow: hidden;
	}
	.image-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.image-thumb .remove-img {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 18px;
		height: 18px;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		line-height: 1;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.image-thumb:hover .remove-img {
		opacity: 1;
	}

	/* ─── Actions ─── */
	.actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--ui-divider);
	}

	.mobile-actions {
		display: none;
	}

	.btn-cancel, .btn-back {
		font-family: inherit;
		font-size: 13px;
		padding: 10px 20px;
		border: none;
		border-radius: 10px;
		background: transparent;
		color: var(--ui-cancel);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		letter-spacing: 0.5px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.btn-cancel:hover:not(:disabled), .btn-back:hover:not(:disabled) {
		background: var(--ui-cancel-hover);
	}
	.btn-cancel:disabled, .btn-back:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-next {
		font-family: inherit;
		font-size: 13px;
		min-width: 80px;
		padding: 10px 20px;
		border: none;
		border-radius: 10px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		letter-spacing: 0.5px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}
	.btn-next:hover:not(:disabled) {
		background: var(--ui-divider);
	}
	.btn-next:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-plant {
		font-family: inherit;
		font-size: 13px;
		min-width: 90px;
		padding: 10px 24px;
		border: none;
		border-radius: 10px;
		background: var(--ui-accent);
		color: #fff;
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		letter-spacing: 0.5px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
	.btn-plant:hover:not(:disabled) {
		background: var(--ui-accent-hover);
	}
	.btn-plant:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.btn-plant.planted {
		opacity: 1;
		background: var(--ui-accent);
	}

	.step-dots {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.12));
		transition: width 0.3s, background 0.3s;
	}
	.dot.active {
		width: 18px;
		background: var(--ui-text-muted);
	}

	.spinner {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* ─── Mobile: two-panel slide ─── */
	@media (max-width: 700px) {
		.editor {
			padding: 12px 14px 16px;
			width: 100%;
			max-width: 100%;
			min-width: 0;
			height: calc(100dvh - 24px);
			max-height: calc(100dvh - 24px);
			overflow: hidden;
			border-radius: 14px;
			display: flex;
			flex-direction: column;
		}
		.top-bar {
			flex-wrap: wrap;
			gap: 8px;
			margin-bottom: 12px;
			padding-bottom: 10px;
			flex-shrink: 0;
		}
		.title-input {
			font-size: 16px;
			width: 100%;
		}
		.top-meta {
			display: none;
		}

		.card-body {
			flex: 1;
			min-height: 0;
			overflow: hidden;
		}

		.panels {
			gap: 0;
			min-height: 0;
			height: 100%;
			transform: translateX(calc(var(--step) * -100%));
			transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
		}

		.panel {
			width: 100%;
			min-width: 100%;
			max-width: 100%;
			flex-shrink: 0;
			overflow: hidden;
			scrollbar-width: none;
			padding: 0;
			box-sizing: border-box;
		}
		.panel::-webkit-scrollbar {
			display: none;
		}

		.panel-write {
			overflow-y: auto;
			min-height: 0;
			display: flex;
			flex-direction: column;
			padding: 0 2px;
		}

		.panel-flower {
			width: 100%;
			order: 0;
			overflow-x: hidden;
			overflow-y: auto;
			padding: 0 2px;
		}

		.panel-flower-scroll {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.journal-textarea {
			min-height: 80px;
			flex: 1;
			resize: none;
		}

		.preview-section {
			min-height: 240px;
		}

		.mobile-hide {
			display: none;
		}

		.desktop-actions {
			display: none;
		}
		.mobile-actions {
			display: flex;
			justify-content: space-between;
			flex-shrink: 0;
			padding-top: 12px;
			margin-top: 12px;
		}
	}
</style>
