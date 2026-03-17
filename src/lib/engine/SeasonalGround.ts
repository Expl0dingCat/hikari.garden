/**
 * Returns a seasonal tint applied to grass colors.
 * Colors shift subtly based on the real-world season.
 */

interface SeasonTint {
	r: number;
	g: number;
	b: number;
}

const SEASON_TINTS: Record<string, SeasonTint> = {
	spring: { r: 1.0, g: 1.05, b: 1.02 },   // slightly brighter green
	summer: { r: 1.0, g: 1.0, b: 0.95 },     // warm, full green
	autumn: { r: 1.08, g: 0.98, b: 0.88 },    // warm amber tint
	winter: { r: 0.92, g: 0.95, b: 1.08 },    // cool blue frost
};

function getSeason(month: number, day: number): string {
	if ((month === 2 && day >= 20) || month === 3 || month === 4 || (month === 5 && day < 21)) return 'spring';
	if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day < 22)) return 'summer';
	if ((month === 8 && day >= 22) || month === 9 || month === 10 || (month === 11 && day < 21)) return 'autumn';
	return 'winter';
}

function getSeasonTint(): SeasonTint {
	const now = new Date();
	return SEASON_TINTS[getSeason(now.getMonth(), now.getDate())];
}

/**
 * Apply seasonal tint to a hex number color (e.g. 0x4a7c59 → tinted number).
 */
export function applySeasonalTintNum(color: number): number {
	const tint = getSeasonTint();
	const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * tint.r)));
	const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * tint.g)));
	const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * tint.b)));
	return (r << 16) | (g << 8) | b;
}

/**
 * Get the current season name.
 */
export function getCurrentSeason(): string {
	const now = new Date();
	return getSeason(now.getMonth(), now.getDate());
}
