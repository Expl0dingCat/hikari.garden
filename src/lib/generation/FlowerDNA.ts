import type { MoodVector, FlowerDNA, PetalShapeId } from '$lib/types.js';
import { mulberry32, pick, range, rangeInt } from './SeededRandom.js';
import { getPalette } from './ColorPalettes.js';
import { getAllShapeIds } from './PetalShapes.js';

const SHAPE_MOOD_MAP: Record<string, PetalShapeId[]> = {
	tender: ['round', 'heart', 'bell'],
	sharp: ['pointed', 'star', 'jagged'],
	ethereal: ['wispy', 'teardrop']
};

function selectPetalShape(mood: MoodVector, rng: () => number): PetalShapeId {
	if (mood.tenderness > 0.65) return pick(rng, SHAPE_MOOD_MAP.tender);
	if (mood.energy > 0.7 && mood.joy < 0.4) return pick(rng, SHAPE_MOOD_MAP.sharp);
	if (mood.clarity < 0.3 || mood.energy < 0.3) return pick(rng, SHAPE_MOOD_MAP.ethereal);
	return pick(rng, getAllShapeIds());
}

export function generateFlowerDNA(mood: MoodVector, seed: number): FlowerDNA {
	const rng = mulberry32(seed);

	const palette = getPalette(mood);

	// Petal count: joy + energy push higher counts
	const basePetals = 3 + Math.round((mood.joy * 0.5 + mood.energy * 0.5) * 9);
	const petalCount = Math.max(3, Math.min(12, basePetals + rangeInt(rng, -1, 1)));

	// Bloom state: hope and joy open the flower
	const bloomState = Math.min(1, Math.max(0, (mood.hope * 0.6 + mood.joy * 0.4) + range(rng, -0.1, 0.1)));

	// Stem height: energy makes taller stems
	const stemHeight = Math.round(8 + mood.energy * 16 + range(rng, -2, 2));

	// Stem curve: tenderness adds graceful curves
	const stemCurve = mood.tenderness * 0.8 + range(rng, -0.1, 0.1);

	// Leaf count
	const leafCount = rangeInt(rng, 0, Math.round(mood.energy * 2 + mood.hope));

	// Symmetry: high clarity favors radial, low favors bilateral
	const symmetry: 'radial' | 'bilateral' = mood.clarity > 0.5 + range(rng, -0.2, 0.2) ? 'radial' : 'bilateral';

	// Petal size influenced by energy
	const petalSize = 0.7 + mood.energy * 0.6 + range(rng, -0.1, 0.1);

	// Per-petal variation
	const petalVariation: number[] = [];
	for (let i = 0; i < petalCount; i++) {
		petalVariation.push(range(rng, 0.85, 1.15));
	}

	// Sparkle: rare, needs high clarity
	const sparkle = mood.clarity > 0.8 && rng() > 0.5;

	// Slight rotation
	const rotation = range(rng, -0.15, 0.15);

	return {
		petalCount,
		petalShape: selectPetalShape(mood, rng),
		petalSize,
		bloomState,
		stemHeight: Math.max(8, Math.min(24, stemHeight)),
		stemCurve: Math.max(0, Math.min(1, stemCurve)),
		leafCount: Math.max(0, Math.min(3, leafCount)),
		petalColors: palette.petals,
		centerColor: palette.center,
		stemColor: palette.stem,
		symmetry,
		rotation,
		petalVariation,
		sparkle
	};
}
