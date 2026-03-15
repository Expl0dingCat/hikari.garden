import type { MoodVector } from '$lib/types.js';
import { mulberry32 } from './SeededRandom.js';

// ── Syllable building blocks for genus names ──

interface SyllablePool {
	mood: Partial<MoodVector>;
	onset: string[];
	nucleus: string[];
	coda: string[];
}

const syllablePools: SyllablePool[] = [
	{
		mood: { joy: 1, hope: 0.7 },
		onset: ['l', 'r', 'fl', 'cl', 'br', 'gl', 'bl', 'pr', 'cr', 'al', 'il', 'am', 'ph', 'ch'],
		nucleus: ['a', 'ia', 'ea', 'au', 'ei', 'ae', 'ou', 'ai', 'eo', 'io', 'oa', 'ue'],
		coda: ['ra', 'la', 'na', 'lia', 'ria', 'sia', 'nia', 'dia', 'thea', 'cea', 'lea', 'mia', 'via', 'nea']
	},
	{
		mood: { joy: 0, hope: 0.2 },
		onset: ['m', 'n', 'th', 'wh', 'sh', 'ph', 'v', 'f', 'ch', 'gn', 'pn', 'ps', 'sc'],
		nucleus: ['u', 'o', 'oe', 'ue', 'ua', 'i', 'ou', 'eu', 'yi', 'uo', 'ao', 'ei'],
		coda: ['mus', 'nis', 'lum', 'rum', 'thus', 'pha', 'mis', 'tis', 'gus', 'nox', 'lux', 'fer', 'bris', 'lis']
	},
	{
		mood: { energy: 1, clarity: 0.6 },
		onset: ['k', 'cr', 'tr', 'st', 'sp', 'sc', 'z', 'dr', 'gr', 'str', 'pr', 'thr', 'qu', 'x'],
		nucleus: ['a', 'i', 'e', 'ax', 'ix', 'ex', 'o', 'yr', 'ar', 'or', 'en', 'an'],
		coda: ['tus', 'cus', 'rix', 'dra', 'trix', 'ris', 'lex', 'pis', 'nax', 'vex', 'dex', 'thus', 'gis', 'kis']
	},
	{
		mood: { energy: 0, tenderness: 0.6 },
		onset: ['s', 'l', 'w', 'h', 'y', 'sw', 'sl', 'ly', 'sy', 'wh', 'fl', 'gl'],
		nucleus: ['e', 'i', 'ie', 'ee', 'ea', 'io', 'eo', 'ae', 'ei', 'ue', 'ia', 'oa'],
		coda: ['na', 'lis', 'nea', 'lea', 'sia', 'mia', 'via', 'rea', 'wen', 'lyn', 'ina', 'ena', 'ula', 'ara']
	},
	{
		mood: { tenderness: 1, joy: 0.5 },
		onset: ['r', 'v', 'p', 'b', 'am', 'an', 'el', 'il', 'ros', 'lil', 'ad', 'em', 'in'],
		nucleus: ['o', 'a', 'oe', 'ia', 'ua', 'ou', 'oa', 'ie', 'ei', 'ae', 'ue', 'io'],
		coda: ['sa', 'ra', 'tha', 'bella', 'rosa', 'mosa', 'nia', 'ola', 'issa', 'etta', 'ella', 'anda', 'ora', 'ina']
	},
	{
		mood: { clarity: 1, energy: 0.5 },
		onset: ['cr', 'cl', 'pr', 'pl', 'qu', 'ch', 'str', 'fr', 'gl', 'tr', 'sp', 'spl'],
		nucleus: ['i', 'a', 'e', 'y', 'ae', 'is', 'al', 'el', 'an', 'en', 'il', 'ul'],
		coda: ['lis', 'tis', 'nis', 'ris', 'lux', 'pis', 'mis', 'vis', 'nix', 'tex', 'phis', 'cia', 'sia', 'via']
	},
	{
		mood: { hope: 1, joy: 0.5 },
		onset: ['h', 'al', 'ar', 'or', 'sol', 'lun', 'aur', 'cel', 'ser', 'ver', 'lu', 'no'],
		nucleus: ['a', 'e', 'o', 'ia', 'ea', 'ora', 'ara', 'ira', 'ura', 'ela', 'ola', 'una'],
		coda: ['nia', 'dia', 'lia', 'cia', 'ntha', 'mia', 'ria', 'phia', 'tera', 'pera', 'fera', 'vera', 'sola', 'dora']
	},
	{
		mood: { hope: 0, joy: 0 },
		onset: ['d', 'g', 'b', 'gr', 'dr', 'br', 'cr', 'scr', 'kn', 'wr', 'thr', 'str'],
		nucleus: ['u', 'o', 'a', 'ou', 'au', 'uo', 'ae', 'ur', 'or', 'ar', 'un', 'om'],
		coda: ['dum', 'thorn', 'grim', 'bra', 'dris', 'cris', 'mora', 'gor', 'vos', 'nir', 'mur', 'bane', 'vex', 'wraith']
	},
	// Extra cross-mood pools for more variety
	{
		mood: { joy: 0.7, energy: 0.3, tenderness: 0.8 },
		onset: ['per', 'pal', 'cal', 'mel', 'cor', 'flo', 'mir', 'ven'],
		nucleus: ['i', 'a', 'u', 'io', 'ia', 'ea', 'uo', 'ao'],
		coda: ['phis', 'nthe', 'rion', 'lena', 'mena', 'theca', 'cora', 'dina']
	},
	{
		mood: { clarity: 0.8, hope: 0.8, energy: 0.6 },
		onset: ['zen', 'xer', 'ath', 'neo', 'lex', 'pyr', 'cyr', 'aer'],
		nucleus: ['o', 'a', 'i', 'y', 'ae', 'ei', 'ou', 'ia'],
		coda: ['this', 'phis', 'ron', 'lon', 'don', 'mond', 'stel', 'phor']
	},
	{
		mood: { tenderness: 0.3, energy: 0.7, joy: 0.4 },
		onset: ['rh', 'cen', 'ter', 'mag', 'hex', 'pen', 'oct', 'tri'],
		nucleus: ['a', 'o', 'e', 'i', 'an', 'on', 'en', 'or'],
		coda: ['thus', 'gon', 'tera', 'plex', 'gora', 'mera', 'dron', 'lith']
	}
];

// ── Species epithets ──

const speciesWords: { mood: Partial<MoodVector>; words: string[] }[] = [
	{ mood: { joy: 1 }, words: ['aurea', 'lucida', 'radiata', 'splendida', 'jubilans', 'vivida', 'fulgens', 'serena', 'laeta', 'beata', 'hilaris', 'candens', 'nitens', 'rutila', 'gemmea'] },
	{ mood: { joy: 0 }, words: ['pallida', 'cinerea', 'umbrata', 'lacrimosa', 'tristis', 'languida', 'sombra', 'perdita', 'obscura', 'opaca', 'fusca', 'lurida', 'marcida', 'tacita', 'vacua'] },
	{ mood: { energy: 1 }, words: ['ignea', 'fervida', 'rapida', 'acuta', 'fortis', 'vehemens', 'tempesta', 'ardentia', 'impetuosa', 'flagrans', 'torrida', 'stridens', 'vibrans', 'ferox', 'valida'] },
	{ mood: { energy: 0 }, words: ['quieta', 'dormiens', 'placida', 'mollis', 'lenta', 'suavis', 'tenera', 'nebulosa', 'sopora', 'halcyon', 'immota', 'sedula', 'mitis', 'mansueta', 'sopita'] },
	{ mood: { tenderness: 1 }, words: ['rosea', 'delicata', 'blanda', 'amabilis', 'dulcis', 'velutina', 'caressa', 'teneris', 'formosa', 'venusta', 'gratiosa', 'lepida', 'suavis', 'clemens', 'benigna'] },
	{ mood: { clarity: 1 }, words: ['crystallina', 'nitida', 'pura', 'lucens', 'clara', 'vitrea', 'pristina', 'specula', 'pellucida', 'hyalina', 'translucens', 'perspicua', 'limpida', 'serena', 'candida'] },
	{ mood: { hope: 1 }, words: ['nascens', 'aurora', 'renata', 'florens', 'crescens', 'promissa', 'novella', 'stellata', 'oriunda', 'germinans', 'vernalis', 'surgente', 'matutina', 'prima', 'incipiens'] },
	{ mood: { hope: 0 }, words: ['declinata', 'vespertina', 'autumnalis', 'caduca', 'fugacia', 'relicta', 'occidens', 'ultima', 'senescens', 'deficiens', 'moriens', 'evanida', 'labens', 'peritura', 'cadens'] },
	// Cross-mood species
	{ mood: { joy: 0.5, tenderness: 0.8 }, words: ['pudica', 'modesta', 'casta', 'simplex', 'humilis', 'innocens', 'pia', 'grata'] },
	{ mood: { energy: 0.8, hope: 0.8 }, words: ['invicta', 'triumphans', 'regnans', 'dominans', 'superba', 'magnifica', 'excelsa', 'sublimis'] },
	{ mood: { clarity: 0.3, energy: 0.2 }, words: ['mystica', 'arcana', 'velata', 'occulta', 'cryptica', 'latens', 'recondita', 'enigmatica'] }
];

// ── Common name building blocks ──

const commonPrefixes: { mood: Partial<MoodVector>; words: string[] }[] = [
	{ mood: { joy: 1 }, words: ['golden', 'sun', 'honey', 'bright', 'morning', 'laughing', 'dancing', 'shining', 'merry', 'sweet', 'cheerful', 'joyful', 'sunny', 'warm', 'amber', 'butter', 'saffron', 'marigold'] },
	{ mood: { joy: 0 }, words: ['ghost', 'shadow', 'ash', 'grey', 'weeping', 'fading', 'hollow', 'silent', 'lonely', 'pale', 'somber', 'mourning', 'wither', 'barren', 'bleak', 'dust', 'cinder', 'cobweb'] },
	{ mood: { energy: 1 }, words: ['fire', 'wild', 'storm', 'thunder', 'blaze', 'spark', 'fierce', 'crimson', 'flash', 'bold', 'dragon', 'hawk', 'tiger', 'scarlet', 'iron', 'flame', 'lightning', 'tempest'] },
	{ mood: { energy: 0 }, words: ['moon', 'mist', 'cloud', 'snow', 'dream', 'dew', 'silk', 'feather', 'whisper', 'drift', 'lull', 'slumber', 'haze', 'gentle', 'cotton', 'pearl', 'moth', 'fog'] },
	{ mood: { tenderness: 1 }, words: ['velvet', 'rose', 'blush', 'maiden', 'heart', 'kiss', 'soft', 'petal', 'fairy', 'love', 'angel', 'swan', 'lace', 'dove', 'cherry', 'ribbon', 'coral', 'peach'] },
	{ mood: { clarity: 1 }, words: ['crystal', 'glass', 'star', 'ice', 'diamond', 'mirror', 'silver', 'prism', 'clear', 'frost', 'quartz', 'opal', 'lunar', 'arctic', 'glacier', 'platinum', 'dagger', 'needle'] },
	{ mood: { hope: 1 }, words: ['dawn', 'spring', 'first', 'young', 'new', 'rising', 'bloom', 'seedling', 'sprout', 'wish', 'waking', 'cradle', 'genesis', 'early', 'morning', 'fresh', 'ever', 'true'] },
	{ mood: { hope: 0 }, words: ['dusk', 'autumn', 'last', 'winter', 'night', 'waning', 'ember', 'twilight', 'fallen', 'final', 'ruin', 'remnant', 'ending', 'husk', 'tatter', 'bone', 'rust', 'grave'] },
	// Cross-mood
	{ mood: { joy: 0.6, energy: 0.3, tenderness: 0.7 }, words: ['garden', 'meadow', 'bower', 'grove', 'valley', 'brook', 'glade', 'haven'] },
	{ mood: { energy: 0.5, clarity: 0.7, hope: 0.6 }, words: ['north', 'wind', 'stone', 'river', 'mountain', 'cliff', 'peak', 'ridge'] },
	{ mood: { joy: 0.3, tenderness: 0.5, hope: 0.3 }, words: ['old', 'ancient', 'moss', 'lichen', 'oak', 'root', 'bark', 'sage'] }
];

const commonSuffixes = [
	'bell', 'drop', 'cup', 'bloom', 'blossom', 'lily', 'daisy', 'orchid',
	'poppy', 'lotus', 'aster', 'wort', 'vine', 'fern', 'thistle', 'moss',
	'tuft', 'crown', 'cap', 'brush', 'wisp', 'tear', 'puff', 'spike',
	'shade', 'cress', 'herb', 'leaf', 'briar', 'flower', 'rose', 'peony',
	'snapdragon', 'marigold', 'foxglove', 'primrose', 'buttercup', 'clover',
	'yarrow', 'sorrel', 'tansy', 'nettle', 'mint', 'sage', 'thyme', 'rue',
	'anemone', 'dahlia', 'zinnia', 'iris', 'crocus', 'tulip', 'wisteria',
	'jasmine', 'heather', 'lavender', 'violet', 'pansy', 'begonia', 'camellia'
];

// ── Poetic / folkloric name fragments ──

const poeticTitles = [
	"the wanderer's", "the dreamer's", "the mourner's", "the maiden's",
	"the shepherd's", "the witch's", "the poet's", "the child's",
	"the queen's", "the hermit's", "the pilgrim's", "the lover's",
	"the widow's", "the knight's", "the oracle's", "the stranger's",
	"the keeper's", "the weaver's", "the singer's", "the dancer's"
];

const poeticPlaces = [
	'of the hollow', 'of the vale', 'of the deep', 'of the heights',
	'of the moor', 'of the fen', 'of the ridge', 'of the glade',
	'of the marsh', 'of the wood', 'of the dell', 'of the glen',
	'of the shore', 'of the cliff', 'of the meadow', 'of the dunes'
];

const mythicNames = [
	'Elowen', 'Isolde', 'Linnea', 'Ondine', 'Thisbe', 'Calyx', 'Nyssa',
	'Azalea', 'Ione', 'Daphne', 'Calla', 'Acacia', 'Briar', 'Wren',
	'Asphodel', 'Amaranth', 'Oleander', 'Jessamine', 'Clematis', 'Hellebore',
	'Aconite', 'Belladonna', 'Artemisia', 'Lorelei', 'Seraphina', 'Ophelia',
	'Sable', 'Vesper', 'Soleil', 'Lunaria', 'Stellaria', 'Edelweiss'
];

// ── Scoring ──

function scoreMoodMatch(mood: MoodVector, target: Partial<MoodVector>): number {
	let score = 0;
	let count = 0;
	for (const key of Object.keys(target) as (keyof MoodVector)[]) {
		const targetVal = target[key]!;
		const moodVal = mood[key];
		score += 1 - Math.abs(moodVal - targetVal);
		count++;
	}
	return count > 0 ? score / count : 0;
}

function weightedPick(rng: () => number, items: { mood: Partial<MoodVector>; words: string[] }[], mood: MoodVector): string {
	const scored = items
		.map((item) => ({ item, score: scoreMoodMatch(mood, item.mood) }))
		.sort((a, b) => b.score - a.score);

	const top = scored.slice(0, 4);
	const total = top.reduce((s, t) => s + t.score, 0);
	let r = rng() * total;
	for (const { item, score } of top) {
		r -= score;
		if (r <= 0) return item.words[Math.floor(rng() * item.words.length)];
	}
	return top[0].item.words[Math.floor(rng() * top[0].item.words.length)];
}

function pick(rng: () => number, arr: string[]): string {
	return arr[Math.floor(rng() * arr.length)];
}

// ── Genus name generator ──

function generateGenusName(mood: MoodVector, rng: () => number): string {
	const scored = syllablePools
		.map((pool) => ({ pool, score: scoreMoodMatch(mood, pool.mood) }))
		.sort((a, b) => b.score - a.score);

	const top = scored.slice(0, 4);
	const total = top.reduce((s, t) => s + t.score, 0);

	function pickPool(): SyllablePool {
		let r = rng() * total;
		for (const { pool, score } of top) {
			r -= score;
			if (r <= 0) return pool;
		}
		return top[0].pool;
	}

	const syllableCount = rng() < 0.3 ? 2 : rng() < 0.8 ? 3 : 4;
	let name = '';

	for (let i = 0; i < syllableCount; i++) {
		const pool = pickPool();
		if (i === 0) {
			name += pool.onset[Math.floor(rng() * pool.onset.length)];
			name += pool.nucleus[Math.floor(rng() * pool.nucleus.length)];
		} else if (i === syllableCount - 1) {
			name += pool.coda[Math.floor(rng() * pool.coda.length)];
		} else {
			// Middle syllable — shorter connector
			const connectors = ['ri', 'li', 'ni', 'mi', 'si', 'ra', 'la', 'na', 'ma', 'sa',
				'ro', 'lo', 'no', 'mo', 'so', 'ti', 'di', 'vi', 'phi', 'chi',
				'ber', 'der', 'ter', 'ger', 'per', 'ven', 'den', 'men', 'sen', 'len'];
			name += connectors[Math.floor(rng() * connectors.length)];
		}
	}

	return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Common name generator ──

function generateCommonName(mood: MoodVector, rng: () => number): string {
	const prefix = weightedPick(rng, commonPrefixes, mood);
	const suffix = commonSuffixes[Math.floor(rng() * commonSuffixes.length)];
	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	const roll = rng();
	if (roll < 0.45) {
		// "Goldenblossom"
		return capitalize(prefix) + suffix;
	} else if (roll < 0.75) {
		// "Golden Blossom"
		return capitalize(prefix) + ' ' + capitalize(suffix);
	} else if (roll < 0.9) {
		// "Golden Queen's Blossom"
		return capitalize(prefix) + ' ' + pick(rng, poeticTitles) + ' ' + suffix;
	} else {
		// "Golden Blossom of the Vale"
		return capitalize(prefix) + ' ' + capitalize(suffix) + ' ' + pick(rng, poeticPlaces);
	}
}

// ── Main export ──

export function generateFlowerName(mood: MoodVector, seed: number): string {
	const rng = mulberry32(seed);

	const roll = rng();

	if (roll < 0.2) {
		// Botanical binomial: "Floresia aurea"
		const genus = generateGenusName(mood, rng);
		const species = weightedPick(rng, speciesWords, mood);
		return `${genus} ${species}`;
	} else if (roll < 0.38) {
		// Common name: "Goldenblossom" / "Golden Lily"
		return generateCommonName(mood, rng);
	} else if (roll < 0.5) {
		// Common + binomial: "Sunlily (Claresia vivida)"
		const common = generateCommonName(mood, rng);
		const genus = generateGenusName(mood, rng);
		const species = weightedPick(rng, speciesWords, mood);
		return `${common} (${genus} ${species})`;
	} else if (roll < 0.62) {
		// Genus only: "Velumosa"
		return generateGenusName(mood, rng);
	} else if (roll < 0.74) {
		// Mythic name: "Elowen" / "Asphodel"
		return pick(rng, mythicNames);
	} else if (roll < 0.84) {
		// Mythic + species: "Isolde pallida"
		const myth = pick(rng, mythicNames);
		const species = weightedPick(rng, speciesWords, mood);
		return `${myth} ${species}`;
	} else if (roll < 0.93) {
		// Folkloric: "The Wanderer's Orchid"
		const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
		const title = pick(rng, poeticTitles);
		const suffix = pick(rng, commonSuffixes);
		return capitalize(title) + ' ' + capitalize(suffix);
	} else {
		// Place-bound: "Moonlily of the Hollow"
		const common = generateCommonName(mood, rng);
		return common;
	}
}
