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

export interface Song {
	trackId: string; // Spotify track ID
	title: string;
	artist: string;
	albumArt: string; // URL to album artwork
	spotifyUrl: string; // External Spotify URL for playback
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
	images?: string[];
	song?: Song;
}

export type PetalShapeId =
	| 'round'
	| 'pointed'
	| 'heart'
	| 'star'
	| 'teardrop'
	| 'jagged'
	| 'wispy'
	| 'bell'
	| 'spade'
	| 'flame'
	| 'crescent'
	| 'needle'
	| 'fan'
	| 'lotus';

export interface FlowerDNA {
	petalCount: number; // 3–14
	petalShape: PetalShapeId;
	petalSize: number;
	bloomState: number; // 0–1: bud → full bloom
	stemHeight: number; // 6–28 pixels
	stemCurve: number;
	leafCount: number; // 0–4

	petalColors: [string, string]; // gradient pair
	centerColor: string;
	stemColor: string;

	symmetry: 'radial' | 'bilateral';
	rotation: number;
	petalVariation: number[];
	sparkle: boolean;

	// Layered petals
	petalLayers: number; // 1–2 rings
	innerPetalShape: PetalShapeId;
	innerPetalColor: string;

	// Shape modifiers
	droopAngle: number; // 0–1: how much petals droop
	centerSize: number; // 0.5–3
	accentColor: string;
}
