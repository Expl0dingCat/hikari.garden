<script lang="ts">
	import type { MoodVector } from '$lib/types.js';

	interface Props {
		mood: MoodVector;
		onchange?: (mood: MoodVector) => void;
	}

	let { mood = $bindable(), onchange }: Props = $props();

	const axes: { key: keyof MoodVector; label: string; leftIcon: string; rightIcon: string; leftColor: string; rightColor: string }[] = [
		{ key: 'joy', label: 'Joy', leftIcon: '~', rightIcon: '*', leftColor: '#78909c', rightColor: '#ffd54f' },
		{ key: 'energy', label: 'Energy', leftIcon: '.', rightIcon: '!', leftColor: '#b0bec5', rightColor: '#ff7043' },
		{ key: 'tenderness', label: 'Tenderness', leftIcon: '#', rightIcon: '~', leftColor: '#90a4ae', rightColor: '#f48fb1' },
		{ key: 'clarity', label: 'Clarity', leftIcon: '?', rightIcon: '+', leftColor: '#78909c', rightColor: '#4fc3f7' },
		{ key: 'hope', label: 'Hope', leftIcon: '-', rightIcon: '^', leftColor: '#616161', rightColor: '#ffcc02' }
	];

	function handleInput(key: keyof MoodVector, value: number) {
		mood = { ...mood, [key]: value };
		onchange?.(mood);
	}
</script>

<div class="mood-selector">
	{#each axes as axis}
		<div class="mood-axis">
			<span class="axis-icon left">{axis.leftIcon}</span>
			<div class="slider-container">
				<label class="axis-label">
					{axis.label}
					<input
						type="range"
						min="0"
						max="100"
						value={Math.round(mood[axis.key] * 100)}
						oninput={(e) => handleInput(axis.key, parseInt(e.currentTarget.value) / 100)}
						style="--left-color: {axis.leftColor}; --right-color: {axis.rightColor}; --value: {mood[axis.key] * 100}%"
					/>
				</label>
			</div>
			<span class="axis-icon right">{axis.rightIcon}</span>
		</div>
	{/each}
</div>

<style>
	.mood-selector {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
	}

	.mood-axis {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.axis-icon {
		font-size: 14px;
		width: 18px;
		text-align: center;
		color: var(--ui-text-muted, rgba(50,80,50,0.35));
		user-select: none;
		font-weight: 600;
	}

	.slider-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.axis-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 1.5px;
		color: var(--ui-text-muted, rgba(0,0,0,0.4));
		font-family: inherit;
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: linear-gradient(
			to right,
			var(--left-color) 0%,
			var(--right-color) 100%
		);
		outline: none;
		cursor: pointer;
		margin-top: 4px;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--ui-text, #444);
		border: 2px solid var(--ui-card, #fff);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	input[type='range']::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--ui-text, #444);
		border: 2px solid var(--ui-card, #fff);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
</style>
