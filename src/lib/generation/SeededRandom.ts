export function mulberry32(seed: number): () => number {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return hash;
}

export function createRng(id: string, date: string): () => number {
	return mulberry32(hashString(id + date));
}

export function pick<T>(rng: () => number, arr: T[]): T {
	return arr[Math.floor(rng() * arr.length)];
}

export function range(rng: () => number, min: number, max: number): number {
	return min + rng() * (max - min);
}

export function rangeInt(rng: () => number, min: number, max: number): number {
	return Math.floor(range(rng, min, max + 1));
}
