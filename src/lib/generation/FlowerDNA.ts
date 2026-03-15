import type { MoodVector, FlowerDNA, PetalShapeId } from '$lib/types.js';
import { mulberry32, pick, range, rangeInt } from './SeededRandom.js';
import { getPalette, lerpColor } from './ColorPalettes.js';
import { getAllShapeIds } from './PetalShapes.js';

const SHAPE_MOOD_MAP: Record<string, PetalShapeId[]> = {
	tender: ['round', 'heart', 'bell', 'lotus'],
	sharp: ['pointed', 'star', 'jagged', 'flame', 'spade'],
	ethereal: ['wispy', 'teardrop', 'crescent', 'needle'],
	wide: ['fan', 'round', 'bell', 'lotus']
};

function selectPetalShape(mood: MoodVector, rng: () => number): PetalShapeId {
	const roll = rng();

	// 30% chance of any shape regardless of mood (wild variety)
	if (roll < 0.3) return pick(rng, getAllShapeIds());

	// Mood-influenced selection
	if (mood.tenderness > 0.65) return pick(rng, SHAPE_MOOD_MAP.tender);
	if (mood.energy > 0.7 && mood.joy < 0.4) return pick(rng, SHAPE_MOOD_MAP.sharp);
	if (mood.clarity < 0.3 || mood.energy < 0.3) return pick(rng, SHAPE_MOOD_MAP.ethereal);
	if (mood.energy < 0.4 && mood.tenderness > 0.4) return pick(rng, SHAPE_MOOD_MAP.wide);

	return pick(rng, getAllShapeIds());
}

export function generateFlowerDNA(mood: MoodVector, seed: number): FlowerDNA {
	const rng = mulberry32(seed);

	// Palette selection now uses weighted random instead of blending
	const palette = getPalette(mood, rng);

	// --- Petal count: wider range, more seed influence ---
	const moodInfluence = mood.joy * 0.4 + mood.energy * 0.3 + mood.hope * 0.3;
	const basePetals = 3 + Math.round(moodInfluence * 11 + range(rng, -2, 2));
	const petalCount = Math.max(3, Math.min(14, basePetals));

	// --- Bloom state: nonlinear curve ---
	const rawBloom = mood.hope * 0.5 + mood.joy * 0.3 + rng() * 0.2;
	const bloomState = Math.min(1, Math.max(0, rawBloom * rawBloom + range(rng, -0.05, 0.05)));

	// --- Stem: wider range ---
	const stemHeight = Math.round(6 + mood.energy * 20 + range(rng, -3, 3));
	const stemCurve = Math.pow(mood.tenderness, 0.7) * 0.9 + range(rng, -0.15, 0.15);
	const leafCount = rangeInt(rng, 0, Math.round(mood.energy * 2.5 + mood.hope * 1.5));

	// --- Symmetry ---
	const symmetry: 'radial' | 'bilateral' =
		mood.clarity > 0.5 + range(rng, -0.25, 0.25) ? 'radial' : 'bilateral';

	// --- Petal size: wider range, more seed variation ---
	const petalSize = 0.5 + mood.energy * 0.5 + rng() * 0.5 + range(rng, -0.1, 0.1);

	// --- Per-petal variation: wider for low clarity (more organic) ---
	const petalVariation: number[] = [];
	const variationAmount = 0.1 + (1 - mood.clarity) * 0.2;
	for (let i = 0; i < petalCount; i++) {
		petalVariation.push(range(rng, 1 - variationAmount, 1 + variationAmount));
	}

	// --- Sparkle: more conditions ---
	const sparkle = (mood.clarity > 0.7 && rng() > 0.4) || (mood.joy > 0.8 && rng() > 0.6);

	// --- Rotation: slightly wider ---
	const rotation = range(rng, -0.25, 0.25);

	// --- Petal layers: more likely with higher petal counts ---
	const layerRoll = rng();
	const petalLayers = petalCount >= 5 && layerRoll < 0.35 + mood.tenderness * 0.15 ? 2 : 1;

	// --- Inner petal shape (for layered flowers) ---
	const innerPetalShape = selectPetalShape(mood, rng);

	// --- Inner petal color: blend toward center ---
	const innerPetalColor =
		petalLayers >= 2
			? lerpColor(palette.petals[1], palette.center, 0.3 + rng() * 0.4)
			: palette.petals[1];

	// --- Droop angle: sad/low-energy flowers droop ---
	const droopBase = (1 - mood.joy) * 0.3 + (1 - mood.energy) * 0.3 + (1 - mood.hope) * 0.2;
	const droopAngle = Math.max(0, Math.min(1, droopBase + range(rng, -0.15, 0.15)));

	// --- Center size: varies per flower ---
	const centerSize = 1 + rng() * 1.5 + mood.energy * 0.5;

	return {
		petalCount,
		petalShape: selectPetalShape(mood, rng),
		petalSize: Math.max(0.4, Math.min(1.8, petalSize)),
		bloomState,
		stemHeight: Math.max(6, Math.min(28, stemHeight)),
		stemCurve: Math.max(0, Math.min(1, stemCurve)),
		leafCount: Math.max(0, Math.min(4, leafCount)),
		petalColors: palette.petals,
		centerColor: palette.center,
		stemColor: palette.stem,
		symmetry,
		rotation,
		petalVariation,
		sparkle,
		petalLayers,
		innerPetalShape,
		innerPetalColor,
		droopAngle,
		centerSize: Math.max(0.5, Math.min(3, centerSize)),
		accentColor: palette.accent
	};
}
