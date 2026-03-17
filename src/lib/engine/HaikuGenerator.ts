import type { MoodVector } from '$lib/types.js';

/**
 * Generates mood-based haiku (5-7-5 syllable structure) for rare flower whispers.
 * Each mood combination selects from appropriate word banks.
 */

// Pre-composed lines grouped by mood tendency and syllable count
const lines5: Record<string, string[]> = {
	joy: [
		'warm light fills the sky',
		'petals catch the sun',
		'laughter in the breeze',
		'golden hours pass',
		'honey on my lips',
	],
	sadness: [
		'grey skies press their weight',
		'silence fills the room',
		'cold rain on the glass',
		'shadows hold me close',
		'echoes fade to dust',
	],
	energy: [
		'sparks fly through the air',
		'rivers rush ahead',
		'thunder shakes the ground',
		'fire in my veins',
		'wind whips through the trees',
	],
	calm: [
		'still water reflects',
		'soft moss on old stone',
		'candle flame holds still',
		'breath comes slow and deep',
		'silence is enough',
	],
	tender: [
		'your hand touches mine',
		'petals soft as skin',
		'gentle as the dawn',
		'roses in the rain',
		'whispers in the dark',
	],
	guarded: [
		'walls built stone by stone',
		'thorns protect the heart',
		'distance keeps me safe',
		'frost on iron gates',
		'armor worn too long',
	],
	clear: [
		'crystal morning air',
		'truth rings like a bell',
		'all the paths converge',
		'the answer is here',
		'light cuts through the fog',
	],
	foggy: [
		'mist hides every path',
		'shapes blur in the rain',
		'lost between two worlds',
		'nothing feels quite real',
		'drifting without shore',
	],
	hopeful: [
		'seeds wait for the spring',
		'dawn breaks on the hill',
		'roots push through the dark',
		'tomorrow holds its breath',
		'the bud is not dead',
	],
	despairing: [
		'winter without end',
		'the well has gone dry',
		'ashes in my hands',
		'no stars left to count',
		'the garden is bare',
	],
};

const lines7: Record<string, string[]> = {
	joy: [
		'the world hums a quiet song',
		'everything is gold and light',
		'even shadows seem to dance',
		'sweetness resting in amber',
		'the meadow breathes with color',
	],
	sadness: [
		'the weight of clouds presses down',
		'each step leaves a deeper mark',
		'the melody has forgotten',
		'somewhere a door closes shut',
		'the river has stopped its song',
	],
	energy: [
		'lightning splits the summer sky',
		'the drum beats faster and fast',
		'a wildfire through the forest',
		'every nerve alive and bright',
		'the wave crashes on the shore',
	],
	calm: [
		'the lake does not need the wind',
		'a single leaf falls to earth',
		'the tea steeps in quiet warmth',
		'time stretches like afternoon',
		'no hurry to reach the end',
	],
	tender: [
		'your name is a song I know',
		'the softest thing I have held',
		'a lullaby for the lost',
		'holding on with gentle hands',
		'the heart opens like a bloom',
	],
	guarded: [
		'the castle keeps its own watch',
		'these walls were built for a reason',
		'I learned early not to show',
		'the hedgehog curls in on self',
		'love is a risk I weigh slow',
	],
	clear: [
		'the puzzle pieces align',
		'I see the shape of my life',
		'understanding comes at last',
		'the fog lifts to show the road',
		'clarity sharp as winter',
	],
	foggy: [
		'I cannot find the edges',
		'the compass needle just spins',
		'meaning slips like water through',
		'somewhere behind all this grey',
		'the mirror shows a stranger',
	],
	hopeful: [
		'something green is pushing through',
		'the crack lets the light slip in',
		'I can almost see the shore',
		'a bird sings before the dawn',
		'the ice is beginning to thaw',
	],
	despairing: [
		'the night stretches without stars',
		'I have forgotten the taste',
		'the roots have nothing to hold',
		'even memory fades to grey',
		'no footprints lead back to home',
	],
};

function getMoodKeys(mood: MoodVector): { primary5: string; primary7: string; closing5: string } {
	const axes: { key: string; high: string; low: string; value: number }[] = [
		{ key: 'joy', high: 'joy', low: 'sadness', value: mood.joy },
		{ key: 'energy', high: 'energy', low: 'calm', value: mood.energy },
		{ key: 'tenderness', high: 'tender', low: 'guarded', value: mood.tenderness },
		{ key: 'clarity', high: 'clear', low: 'foggy', value: mood.clarity },
		{ key: 'hope', high: 'hopeful', low: 'despairing', value: mood.hope },
	];

	// Sort by distance from 0.5 (most extreme moods first)
	const sorted = axes.sort((a, b) => Math.abs(b.value - 0.5) - Math.abs(a.value - 0.5));

	const pick = (axis: typeof axes[0]) => axis.value >= 0.5 ? axis.high : axis.low;

	return {
		primary5: pick(sorted[0]),
		primary7: pick(sorted[1]),
		closing5: pick(sorted[2]),
	};
}

/** Generate a haiku from a mood vector using a seed for determinism */
export function generateHaiku(mood: MoodVector, seed: number): string {
	const keys = getMoodKeys(mood);

	const pick = (arr: string[], s: number) => arr[Math.abs(s) % arr.length];

	const line1 = pick(lines5[keys.primary5], seed);
	const line2 = pick(lines7[keys.primary7], seed * 3 + 7);
	const line3 = pick(lines5[keys.closing5], seed * 7 + 13);

	return `${line1} / ${line2} / ${line3}`;
}
