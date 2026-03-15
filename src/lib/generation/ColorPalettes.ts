import type { MoodVector } from '$lib/types.js';

export interface ColorPalette {
	petals: [string, string];
	center: string;
	stem: string;
	accent: string;
}

interface WeightedPalette {
	mood: MoodVector;
	palette: ColorPalette;
}

const palettes: WeightedPalette[] = [
	// 1. Warm sunset — high joy, high energy
	{
		mood: { joy: 1, energy: 1, tenderness: 0.3, clarity: 0.5, hope: 0.7 },
		palette: { petals: ['#ff6b6b', '#ffd93d'], center: '#fff3e0', stem: '#4a7c59', accent: '#ff8e53' }
	},
	// 2. Soft pastel — high joy, low energy
	{
		mood: { joy: 0.9, energy: 0.2, tenderness: 0.8, clarity: 0.5, hope: 0.6 },
		palette: { petals: ['#c9b1ff', '#ffc4d6'], center: '#fff8e7', stem: '#7db88f', accent: '#e8b4f8' }
	},
	// 3. Storm — low joy, high energy
	{
		mood: { joy: 0.1, energy: 0.9, tenderness: 0.2, clarity: 0.3, hope: 0.2 },
		palette: { petals: ['#4a148c', '#e53935'], center: '#263238', stem: '#37474f', accent: '#7c4dff' }
	},
	// 4. Muted earth — low joy, low energy
	{
		mood: { joy: 0.1, energy: 0.1, tenderness: 0.3, clarity: 0.2, hope: 0.1 },
		palette: { petals: ['#8d6e63', '#a1887f'], center: '#6d4c41', stem: '#5d4037', accent: '#bcaaa4' }
	},
	// 5. Rose garden — high tenderness
	{
		mood: { joy: 0.6, energy: 0.4, tenderness: 1, clarity: 0.5, hope: 0.6 },
		palette: { petals: ['#f48fb1', '#f8bbd0'], center: '#fce4ec', stem: '#66bb6a', accent: '#ec407a' }
	},
	// 6. Crystal clear — high clarity
	{
		mood: { joy: 0.5, energy: 0.5, tenderness: 0.3, clarity: 1, hope: 0.5 },
		palette: { petals: ['#4fc3f7', '#b3e5fc'], center: '#e1f5fe', stem: '#43a047', accent: '#00bcd4' }
	},
	// 7. Dawn hope — high hope
	{
		mood: { joy: 0.6, energy: 0.5, tenderness: 0.5, clarity: 0.6, hope: 1 },
		palette: { petals: ['#ffcc02', '#ff9800'], center: '#fff9c4', stem: '#558b2f', accent: '#ffab40' }
	},
	// 8. Twilight — moderate everything
	{
		mood: { joy: 0.4, energy: 0.3, tenderness: 0.6, clarity: 0.4, hope: 0.4 },
		palette: { petals: ['#7e57c2', '#5c6bc0'], center: '#9fa8da', stem: '#455a64', accent: '#b388ff' }
	},
	// 9. Spring green — balanced positive
	{
		mood: { joy: 0.7, energy: 0.6, tenderness: 0.5, clarity: 0.7, hope: 0.8 },
		palette: { petals: ['#81c784', '#aed581'], center: '#f1f8e9', stem: '#33691e', accent: '#69f0ae' }
	},
	// 10. Ice — low everything except clarity
	{
		mood: { joy: 0.2, energy: 0.2, tenderness: 0.1, clarity: 0.9, hope: 0.3 },
		palette: { petals: ['#90a4ae', '#b0bec5'], center: '#cfd8dc', stem: '#546e7a', accent: '#80cbc4' }
	},
	// 11. Ember — low joy, moderate energy
	{
		mood: { joy: 0.3, energy: 0.6, tenderness: 0.4, clarity: 0.3, hope: 0.5 },
		palette: { petals: ['#d84315', '#bf360c'], center: '#ffab91', stem: '#4e342e', accent: '#ff6e40' }
	},
	// 12. Moonlight — low energy, high tenderness
	{
		mood: { joy: 0.4, energy: 0.1, tenderness: 0.9, clarity: 0.6, hope: 0.5 },
		palette: { petals: ['#e1bee7', '#ce93d8'], center: '#f3e5f5', stem: '#6a8a6d', accent: '#ba68c8' }
	},
	// 13. Cherry blossom — tender + joyful
	{
		mood: { joy: 0.7, energy: 0.3, tenderness: 0.9, clarity: 0.6, hope: 0.7 },
		palette: { petals: ['#ffb7c5', '#fce4ec'], center: '#fff9c4', stem: '#5d4037', accent: '#f06292' }
	},
	// 14. Ocean deep — calm + clear
	{
		mood: { joy: 0.3, energy: 0.3, tenderness: 0.5, clarity: 0.7, hope: 0.4 },
		palette: { petals: ['#1565c0', '#42a5f5'], center: '#90caf9', stem: '#2e7d32', accent: '#0288d1' }
	},
	// 15. Autumn — fading warmth
	{
		mood: { joy: 0.5, energy: 0.4, tenderness: 0.4, clarity: 0.5, hope: 0.3 },
		palette: { petals: ['#e65100', '#f57f17'], center: '#ffe0b2', stem: '#33691e', accent: '#ff6d00' }
	},
	// 16. Electric — high energy + clarity
	{
		mood: { joy: 0.8, energy: 1, tenderness: 0.1, clarity: 0.9, hope: 0.6 },
		palette: { petals: ['#00e5ff', '#76ff03'], center: '#ffffff', stem: '#1b5e20', accent: '#ffea00' }
	},
	// 17. Lavender field — soft + tender
	{
		mood: { joy: 0.5, energy: 0.2, tenderness: 0.7, clarity: 0.5, hope: 0.5 },
		palette: { petals: ['#9575cd', '#b39ddb'], center: '#ede7f6', stem: '#6d8f6d', accent: '#7e57c2' }
	},
	// 18. Coral reef — warm + lively
	{
		mood: { joy: 0.8, energy: 0.6, tenderness: 0.6, clarity: 0.6, hope: 0.7 },
		palette: { petals: ['#ff7043', '#ffab91'], center: '#fff3e0', stem: '#00897b', accent: '#ff5722' }
	},
	// 19. Midnight — deep darkness
	{
		mood: { joy: 0.1, energy: 0.1, tenderness: 0.4, clarity: 0.3, hope: 0.1 },
		palette: { petals: ['#283593', '#1a237e'], center: '#5c6bc0', stem: '#1b3a28', accent: '#3f51b5' }
	},
	// 20. Honey — warm + hopeful
	{
		mood: { joy: 0.6, energy: 0.4, tenderness: 0.6, clarity: 0.5, hope: 0.6 },
		palette: { petals: ['#ffb300', '#ffa000'], center: '#fff8e1', stem: '#558b2f', accent: '#ffc107' }
	},
	// 21. Frost — cold clarity
	{
		mood: { joy: 0.3, energy: 0.3, tenderness: 0.1, clarity: 0.8, hope: 0.4 },
		palette: { petals: ['#cfd8dc', '#eceff1'], center: '#ffffff', stem: '#78909c', accent: '#b3e5fc' }
	},
	// 22. Wildfire — max energy, destructive
	{
		mood: { joy: 0.2, energy: 1, tenderness: 0.1, clarity: 0.2, hope: 0.3 },
		palette: { petals: ['#b71c1c', '#ff1744'], center: '#ff8a80', stem: '#3e2723', accent: '#ff5252' }
	},
	// 23. Serenity — calm balance
	{
		mood: { joy: 0.5, energy: 0.3, tenderness: 0.5, clarity: 0.6, hope: 0.6 },
		palette: { petals: ['#80deea', '#b2ebf2'], center: '#e0f7fa', stem: '#4caf50', accent: '#4dd0e1' }
	},
	// 24. Volcanic — intense dark energy
	{
		mood: { joy: 0.1, energy: 0.8, tenderness: 0.2, clarity: 0.2, hope: 0.1 },
		palette: { petals: ['#c62828', '#4e342e'], center: '#ff6e40', stem: '#212121', accent: '#d50000' }
	},
	// 25. Peach dream — gentle joy
	{
		mood: { joy: 0.8, energy: 0.3, tenderness: 0.7, clarity: 0.4, hope: 0.7 },
		palette: { petals: ['#ffccbc', '#ffe0b2'], center: '#fff3e0', stem: '#66bb6a', accent: '#ff8a65' }
	},
	// 26. Deep violet — introspective
	{
		mood: { joy: 0.3, energy: 0.4, tenderness: 0.5, clarity: 0.4, hope: 0.3 },
		palette: { petals: ['#6a1b9a', '#8e24aa'], center: '#ce93d8', stem: '#4a6741', accent: '#ab47bc' }
	},
	// 27. Golden hour — warm hope
	{
		mood: { joy: 0.7, energy: 0.5, tenderness: 0.5, clarity: 0.7, hope: 0.9 },
		palette: { petals: ['#f9a825', '#fbc02d'], center: '#fffde7', stem: '#558b2f', accent: '#ffee58' }
	},
	// 28. Arctic bloom — cold beauty
	{
		mood: { joy: 0.4, energy: 0.1, tenderness: 0.3, clarity: 0.9, hope: 0.5 },
		palette: { petals: ['#e3f2fd', '#bbdefb'], center: '#e8eaf6', stem: '#607d8b', accent: '#64b5f6' }
	}
];

function moodDistance(a: MoodVector, b: MoodVector): number {
	return Math.sqrt(
		(a.joy - b.joy) ** 2 +
			(a.energy - b.energy) ** 2 +
			(a.tenderness - b.tenderness) ** 2 +
			(a.clarity - b.clarity) ** 2 +
			(a.hope - b.hope) ** 2
	);
}

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
	return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function lerpColor(a: string, b: string, t: number): string {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b);
	return rgbToHex(
		Math.round(ar + (br - ar) * t),
		Math.round(ag + (bg - ag) * t),
		Math.round(ab + (bb - ab) * t)
	);
}

function rotateHue(hex: string, degrees: number): string {
	const [r, g, b] = hexToRgb(hex);
	const rad = (degrees * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const sq = Math.sqrt(1 / 3);

	const nr =
		r * (cos + (1 - cos) / 3) +
		g * ((1 - cos) / 3 - sq * sin) +
		b * ((1 - cos) / 3 + sq * sin);
	const ng =
		r * ((1 - cos) / 3 + sq * sin) +
		g * (cos + (1 - cos) / 3) +
		b * ((1 - cos) / 3 - sq * sin);
	const nb =
		r * ((1 - cos) / 3 - sq * sin) +
		g * ((1 - cos) / 3 + sq * sin) +
		b * (cos + (1 - cos) / 3);

	return rgbToHex(
		Math.max(0, Math.min(255, Math.round(nr))),
		Math.max(0, Math.min(255, Math.round(ng))),
		Math.max(0, Math.min(255, Math.round(nb)))
	);
}

export function getPalette(mood: MoodVector, rng: () => number): ColorPalette {
	// Score all palettes by mood distance
	const scored = palettes
		.map((wp) => ({ wp, dist: moodDistance(mood, wp.mood) }))
		.sort((a, b) => a.dist - b.dist);

	// Take top 5 closest, use inverse distance² for sharper selection
	const top = scored.slice(0, 5);
	const weights = top.map((s) => 1 / ((s.dist + 0.05) ** 2));
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);

	// Weighted random selection — pick ONE palette instead of blending
	let roll = rng() * totalWeight;
	let selected = top[0].wp.palette;
	for (let i = 0; i < top.length; i++) {
		roll -= weights[i];
		if (roll <= 0) {
			selected = top[i].wp.palette;
			break;
		}
	}

	// Seed-based hue shift (±45°) for per-flower color uniqueness
	const hueShift = (rng() - 0.5) * 90;

	return {
		petals: [rotateHue(selected.petals[0], hueShift), rotateHue(selected.petals[1], hueShift)],
		center: rotateHue(selected.center, hueShift * 0.3),
		stem: rotateHue(selected.stem, hueShift * 0.15),
		accent: rotateHue(selected.accent, hueShift * 0.8)
	};
}

export { lerpColor, hexToRgb, rgbToHex, rotateHue };
