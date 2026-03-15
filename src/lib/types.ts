export interface MoodVector {
	joy: number; // 0–1  sadness ↔ joy
	energy: number; // 0–1  calm ↔ energetic
	tenderness: number; // 0–1  guarded ↔ tender
	clarity: number; // 0–1  foggy ↔ clear
	hope: number; // 0–1  despair ↔ hope
}

export interface Weather {
	temp: number; // celsius
	icon: string; // emoji
	condition: string; // e.g. "Clear", "Cloudy"
}

export interface JournalEntry {
	id: string;
	date: string; // YYYY-MM-DD
	createdAt: number;
	updatedAt: number;
	title: string; // short heading, max 50 chars
	text: string;
	mood: MoodVector;
	flowerSeed: number;
	flowerName: string;
	tags?: string[];
	weather?: Weather;
}

export type PetalShapeId =
	| 'round'
	| 'pointed'
	| 'heart'
	| 'star'
	| 'teardrop'
	| 'jagged'
	| 'wispy'
	| 'bell';

export interface FlowerDNA {
	petalCount: number; // 3–12
	petalShape: PetalShapeId;
	petalSize: number;
	bloomState: number; // 0–1: bud → full bloom
	stemHeight: number; // 8–24 pixels
	stemCurve: number;
	leafCount: number; // 0–3

	petalColors: [string, string]; // gradient pair
	centerColor: string;
	stemColor: string;

	symmetry: 'radial' | 'bilateral';
	rotation: number;
	petalVariation: number[];
	sparkle: boolean;
}
