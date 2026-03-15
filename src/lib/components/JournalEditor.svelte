<script lang="ts">
	import type { MoodVector } from '$lib/types.js';
	import MoodSelector from './MoodSelector.svelte';
	import FlowerPreview from './FlowerPreview.svelte';
	import { cursorDefault, cursorPointer } from '$lib/stores/garden.js';

	import type { Weather } from '$lib/types.js';

	interface Props {
		onsubmit: (data: { title: string; text: string; mood: MoodVector; date: string; tags: string[]; weather?: Weather }) => void;
		oncancel: () => void;
	}

	let { onsubmit, oncancel }: Props = $props();

	let title = $state('');
	let text = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);
	let tagInput = $state('');
	let tags = $state<string[]>([]);
	let mood = $state<MoodVector>({
		joy: 0.5,
		energy: 0.5,
		tenderness: 0.5,
		clarity: 0.5,
		hope: 0.5
	});
	let submitting = $state(false);
	let weather = $state<Weather | undefined>(undefined);

	// Fetch weather on mount via browser geolocation + Open-Meteo
	$effect(() => {
		if (!navigator.geolocation) return;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const { latitude, longitude } = pos.coords;
					const res = await fetch(
						`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
					);
					if (!res.ok) return;
					const data = await res.json();
					const temp = Math.round(data.current.temperature_2m);
					const code = data.current.weather_code as number;
					const { icon, condition } = weatherCodeToInfo(code);
					weather = { temp, icon, condition };
				} catch {}
			},
			() => {} // silently ignore denied permission
		);
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
		if (t && !tags.includes(t)) {
			tags = [...tags, t];
			tagInput = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	async function handleSubmit() {
		if (!text.trim() || submitting) return;
		submitting = true;
		onsubmit({ title, text, mood, date, tags, weather });
	}
</script>

<div class="editor" style="cursor:{$cursorDefault};--cursor-pointer:{$cursorPointer}">
	<div class="editor-header">
		<input
			bind:value={title}
			placeholder="title for today..."
			class="title-input"
			maxlength={50}
		/>
		<input
			type="date"
			bind:value={date}
			class="date-input"
		/>
	</div>

	<div class="editor-body">
		<div class="writing-area">
			<textarea
				bind:value={text}
				placeholder="How are you feeling today? Write freely..."
				class="journal-textarea"
				rows={8}
			></textarea>

			<div class="tag-area">
				<div class="tags">
					{#each tags as tag}
						<button class="tag" onclick={() => removeTag(tag)}>
							{tag} &times;
						</button>
					{/each}
				</div>
				<input
					bind:value={tagInput}
					placeholder="add a tag..."
					class="tag-input"
					onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
				/>
			</div>
		</div>

		<div class="right-panel">
			<div class="preview-section">
				<FlowerPreview {mood} previewSeed={date} />
			</div>

			<div class="mood-section">
				<MoodSelector bind:mood />
			</div>
		</div>
	</div>

	<div class="actions">
		<button class="btn-cancel" onclick={oncancel}>cancel</button>
		<button class="btn-plant" onclick={handleSubmit} disabled={!text.trim() || submitting}>
			{submitting ? 'planting...' : 'plant this flower'}
		</button>
	</div>
</div>

<style>
	.editor {
		background: rgba(255, 255, 255, 0.96);
		border: 1px solid rgba(100, 160, 100, 0.15);
		border-radius: 20px;
		padding: 32px 36px 28px;
		max-width: 880px;
		width: 94%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
		color: #2a3a2a;
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 24px;
	}

	.title-input {
		flex: 1;
		font-family: inherit;
		font-size: 18px;
		font-weight: 400;
		letter-spacing: 1px;
		padding: 8px 0;
		border: none;
		border-bottom: 1px solid rgba(100, 160, 100, 0.15);
		background: transparent;
		color: #2a3a2a;
		outline: none;
		transition: border-color 0.2s;
	}
	.title-input:focus {
		border-bottom-color: rgba(80, 160, 80, 0.4);
	}
	.title-input::placeholder {
		color: rgba(50, 80, 50, 0.3);
		font-weight: 300;
	}

	.date-input {
		font-family: inherit;
		font-size: 12px;
		padding: 6px 12px;
		border: 1px solid rgba(100, 160, 100, 0.15);
		border-radius: 8px;
		background: rgba(240, 248, 240, 0.5);
		color: #2a3a2a;
		outline: none;
		transition: border-color 0.2s;
	}
	.date-input:focus {
		border-color: rgba(80, 160, 80, 0.3);
	}

	.editor-body {
		display: flex;
		gap: 28px;
	}

	@media (max-width: 700px) {
		.editor-body {
			flex-direction: column;
		}
		.right-panel {
			width: 100% !important;
		}
	}

	.writing-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.journal-textarea {
		font-family: 'Mona Sans', sans-serif;
		font-size: 14px;
		line-height: 1.8;
		padding: 16px 18px;
		border: 1px solid rgba(100, 160, 100, 0.12);
		border-radius: 12px;
		background: rgba(240, 248, 240, 0.4);
		color: #2a3a2a;
		resize: vertical;
		outline: none;
		min-height: 200px;
		transition: border-color 0.2s;
	}
	.journal-textarea:focus {
		border-color: rgba(80, 160, 80, 0.3);
	}
	.journal-textarea::placeholder {
		color: rgba(50, 80, 50, 0.35);
	}

	.tag-area {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.tag {
		font-size: 11px;
		padding: 4px 12px;
		border-radius: 20px;
		background: rgba(80, 150, 80, 0.08);
		color: #4a6a4a;
		border: none;
		cursor: var(--cursor-pointer, pointer);
		font-family: inherit;
		transition: opacity 0.2s;
	}
	.tag:hover {
		opacity: 0.7;
	}

	.tag-input {
		font-family: inherit;
		font-size: 12px;
		padding: 5px 10px;
		border: 1px solid rgba(100, 160, 100, 0.12);
		border-radius: 8px;
		background: transparent;
		color: #2a3a2a;
		outline: none;
		width: 120px;
		transition: border-color 0.2s;
	}
	.tag-input:focus {
		border-color: rgba(80, 160, 80, 0.3);
	}
	.tag-input::placeholder {
		color: rgba(50, 80, 50, 0.35);
	}

	.right-panel {
		width: 260px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.preview-section {
		display: flex;
		justify-content: center;
		padding: 20px 12px;
		background: rgba(80, 150, 80, 0.04);
		border-radius: 14px;
		position: relative;
	}

	.mood-section {
		border-radius: 14px;
		overflow: hidden;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid rgba(0, 0, 0, 0.05);
	}

	.btn-cancel {
		font-family: inherit;
		font-size: 13px;
		padding: 10px 20px;
		border: none;
		border-radius: 10px;
		background: transparent;
		color: rgba(50, 80, 50, 0.5);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		letter-spacing: 0.5px;
	}
	.btn-cancel:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.btn-plant {
		font-family: inherit;
		font-size: 13px;
		padding: 10px 24px;
		border: none;
		border-radius: 10px;
		background: #5a9e60;
		color: #fff;
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		letter-spacing: 0.5px;
	}
	.btn-plant:hover:not(:disabled) {
		background: #4a8e50;
	}
	.btn-plant:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
</style>
