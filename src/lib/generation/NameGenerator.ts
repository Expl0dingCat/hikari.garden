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
		onset: ['l', 'r', 'fl', 'cl', 'br', 'gl', 'bl', 'pr', 'cr', 'al', 'il', 'am', 'ph', 'ch', 'j', 'fr', 'kl', 'pl', 'tl', 'vl'],
		nucleus: ['a', 'ia', 'ea', 'au', 'ei', 'ae', 'ou', 'ai', 'eo', 'io', 'oa', 'ue', 'aia', 'oua', 'eia', 'uia'],
		coda: ['ra', 'la', 'na', 'lia', 'ria', 'sia', 'nia', 'dia', 'thea', 'cea', 'lea', 'mia', 'via', 'nea', 'fia', 'zia', 'pha', 'glia', 'bria', 'tria']
	},
	{
		mood: { joy: 0, hope: 0.2 },
		onset: ['m', 'n', 'th', 'wh', 'sh', 'ph', 'v', 'f', 'ch', 'gn', 'pn', 'ps', 'sc', 'mn', 'ct', 'pt', 'kh', 'gh', 'sth', 'rh'],
		nucleus: ['u', 'o', 'oe', 'ue', 'ua', 'i', 'ou', 'eu', 'yi', 'uo', 'ao', 'ei', 'oi', 'uu', 'oa', 'iu'],
		coda: ['mus', 'nis', 'lum', 'rum', 'thus', 'pha', 'mis', 'tis', 'gus', 'nox', 'lux', 'fer', 'bris', 'lis', 'vum', 'dium', 'crum', 'phos', 'thos', 'mber']
	},
	{
		mood: { energy: 1, clarity: 0.6 },
		onset: ['k', 'cr', 'tr', 'st', 'sp', 'sc', 'z', 'dr', 'gr', 'str', 'pr', 'thr', 'qu', 'x', 'spr', 'skr', 'br', 'fr', 'vr', 'zr'],
		nucleus: ['a', 'i', 'e', 'ax', 'ix', 'ex', 'o', 'yr', 'ar', 'or', 'en', 'an', 'ur', 'ir', 'al', 'el'],
		coda: ['tus', 'cus', 'rix', 'dra', 'trix', 'ris', 'lex', 'pis', 'nax', 'vex', 'dex', 'thus', 'gis', 'kis', 'flux', 'cris', 'phos', 'xis', 'bex', 'thrax']
	},
	{
		mood: { energy: 0, tenderness: 0.6 },
		onset: ['s', 'l', 'w', 'h', 'y', 'sw', 'sl', 'ly', 'sy', 'wh', 'fl', 'gl', 'sh', 'sn', 'sm', 'hy', 'my', 'ny', 'ry', 'vy'],
		nucleus: ['e', 'i', 'ie', 'ee', 'ea', 'io', 'eo', 'ae', 'ei', 'ue', 'ia', 'oa', 'ui', 'ai', 'eia', 'oei'],
		coda: ['na', 'lis', 'nea', 'lea', 'sia', 'mia', 'via', 'rea', 'wen', 'lyn', 'ina', 'ena', 'ula', 'ara', 'esa', 'ova', 'uma', 'yra', 'ithe', 'othe']
	},
	{
		mood: { tenderness: 1, joy: 0.5 },
		onset: ['r', 'v', 'p', 'b', 'am', 'an', 'el', 'il', 'ros', 'lil', 'ad', 'em', 'in', 'ev', 'iv', 'ol', 'ul', 'ath', 'eth', 'oph'],
		nucleus: ['o', 'a', 'oe', 'ia', 'ua', 'ou', 'oa', 'ie', 'ei', 'ae', 'ue', 'io', 'oi', 'eu', 'ao', 'ai'],
		coda: ['sa', 'ra', 'tha', 'bella', 'rosa', 'mosa', 'nia', 'ola', 'issa', 'etta', 'ella', 'anda', 'ora', 'ina', 'etta', 'ilia', 'aria', 'osia', 'esia', 'usia']
	},
	{
		mood: { clarity: 1, energy: 0.5 },
		onset: ['cr', 'cl', 'pr', 'pl', 'qu', 'ch', 'str', 'fr', 'gl', 'tr', 'sp', 'spl', 'scr', 'shr', 'phr', 'thr', 'chr', 'xyl', 'zyg', 'psy'],
		nucleus: ['i', 'a', 'e', 'y', 'ae', 'is', 'al', 'el', 'an', 'en', 'il', 'ul', 'yr', 'or', 'ar', 'ir'],
		coda: ['lis', 'tis', 'nis', 'ris', 'lux', 'pis', 'mis', 'vis', 'nix', 'tex', 'phis', 'cia', 'sia', 'via', 'gis', 'bis', 'fex', 'lex', 'dris', 'thris']
	},
	{
		mood: { hope: 1, joy: 0.5 },
		onset: ['h', 'al', 'ar', 'or', 'sol', 'lun', 'aur', 'cel', 'ser', 'ver', 'lu', 'no', 'ast', 'stel', 'cael', 'aer', 'ven', 'prim', 'nov', 'gen'],
		nucleus: ['a', 'e', 'o', 'ia', 'ea', 'ora', 'ara', 'ira', 'ura', 'ela', 'ola', 'una', 'aya', 'ova', 'ewa', 'isa'],
		coda: ['nia', 'dia', 'lia', 'cia', 'ntha', 'mia', 'ria', 'phia', 'tera', 'pera', 'fera', 'vera', 'sola', 'dora', 'nora', 'lora', 'gora', 'phora', 'thera', 'bora']
	},
	{
		mood: { hope: 0, joy: 0 },
		onset: ['d', 'g', 'b', 'gr', 'dr', 'br', 'cr', 'scr', 'kn', 'wr', 'thr', 'str', 'bl', 'gl', 'shr', 'gh', 'sk', 'sl', 'sm', 'sn'],
		nucleus: ['u', 'o', 'a', 'ou', 'au', 'uo', 'ae', 'ur', 'or', 'ar', 'un', 'om', 'ul', 'ol', 'ath', 'oth'],
		coda: ['dum', 'thorn', 'grim', 'bra', 'dris', 'cris', 'mora', 'gor', 'vos', 'nir', 'mur', 'bane', 'vex', 'wraith', 'shade', 'pyre', 'crypt', 'barr', 'doom', 'fell']
	},
	{
		mood: { joy: 0.7, energy: 0.3, tenderness: 0.8 },
		onset: ['per', 'pal', 'cal', 'mel', 'cor', 'flo', 'mir', 'ven', 'bel', 'del', 'cel', 'fel'],
		nucleus: ['i', 'a', 'u', 'io', 'ia', 'ea', 'uo', 'ao', 'iu', 'oi', 'eu', 'ai'],
		coda: ['phis', 'nthe', 'rion', 'lena', 'mena', 'theca', 'cora', 'dina', 'lora', 'nira', 'mira', 'thia']
	},
	{
		mood: { clarity: 0.8, hope: 0.8, energy: 0.6 },
		onset: ['zen', 'xer', 'ath', 'neo', 'lex', 'pyr', 'cyr', 'aer', 'hel', 'oph', 'eur', 'lyr'],
		nucleus: ['o', 'a', 'i', 'y', 'ae', 'ei', 'ou', 'ia', 'oe', 'ue', 'ai', 'oi'],
		coda: ['this', 'phis', 'ron', 'lon', 'don', 'mond', 'stel', 'phor', 'dron', 'tron', 'gon', 'xon']
	},
	{
		mood: { tenderness: 0.3, energy: 0.7, joy: 0.4 },
		onset: ['rh', 'cen', 'ter', 'mag', 'hex', 'pen', 'oct', 'tri', 'dek', 'pol', 'syn', 'pan'],
		nucleus: ['a', 'o', 'e', 'i', 'an', 'on', 'en', 'or', 'ar', 'er', 'ir', 'ur'],
		coda: ['thus', 'gon', 'tera', 'plex', 'gora', 'mera', 'dron', 'lith', 'morph', 'graph', 'scope', 'phyte']
	},
	{
		mood: { clarity: 0.2, tenderness: 0.4, hope: 0.6 },
		onset: ['syl', 'nym', 'fae', 'eil', 'thal', 'ith', 'eryn', 'gal', 'nim', 'tir', 'lor', 'mal'],
		nucleus: ['a', 'i', 'e', 'ia', 'ie', 'ae', 'ea', 'oe', 'io', 'ei', 'ai', 'ou'],
		coda: ['wen', 'dil', 'riel', 'thil', 'wen', 'mir', 'las', 'dor', 'nor', 'ril', 'thien', 'loth']
	}
];

// ── Species epithets ──

const speciesWords: { mood: Partial<MoodVector>; words: string[] }[] = [
	{ mood: { joy: 1 }, words: ['aurea', 'lucida', 'radiata', 'splendida', 'jubilans', 'vivida', 'fulgens', 'serena', 'laeta', 'beata', 'hilaris', 'candens', 'nitens', 'rutila', 'gemmea', 'felix', 'festiva', 'iocunda', 'gloriosa', 'exultans'] },
	{ mood: { joy: 0 }, words: ['pallida', 'cinerea', 'umbrata', 'lacrimosa', 'tristis', 'languida', 'sombra', 'perdita', 'obscura', 'opaca', 'fusca', 'lurida', 'marcida', 'tacita', 'vacua', 'desolata', 'afflicta', 'maesta', 'misera', 'infelix'] },
	{ mood: { energy: 1 }, words: ['ignea', 'fervida', 'rapida', 'acuta', 'fortis', 'vehemens', 'tempesta', 'ardentia', 'impetuosa', 'flagrans', 'torrida', 'stridens', 'vibrans', 'ferox', 'valida', 'pugnax', 'bellicosa', 'animosa', 'audax', 'intrepida'] },
	{ mood: { energy: 0 }, words: ['quieta', 'dormiens', 'placida', 'mollis', 'lenta', 'suavis', 'tenera', 'nebulosa', 'sopora', 'halcyon', 'immota', 'sedula', 'mitis', 'mansueta', 'sopita', 'tacita', 'pigra', 'gravis', 'tranquilla', 'pacata'] },
	{ mood: { tenderness: 1 }, words: ['rosea', 'delicata', 'blanda', 'amabilis', 'dulcis', 'velutina', 'caressa', 'teneris', 'formosa', 'venusta', 'gratiosa', 'lepida', 'suavis', 'clemens', 'benigna', 'pia', 'cara', 'dilecta', 'amoena', 'pulchra'] },
	{ mood: { clarity: 1 }, words: ['crystallina', 'nitida', 'pura', 'lucens', 'clara', 'vitrea', 'pristina', 'specula', 'pellucida', 'hyalina', 'translucens', 'perspicua', 'limpida', 'serena', 'candida', 'illustris', 'evidens', 'manifesta', 'aperta', 'liquida'] },
	{ mood: { hope: 1 }, words: ['nascens', 'aurora', 'renata', 'florens', 'crescens', 'promissa', 'novella', 'stellata', 'oriunda', 'germinans', 'vernalis', 'surgente', 'matutina', 'prima', 'incipiens', 'rediviva', 'juvenis', 'vegeta', 'fertilis', 'fecunda'] },
	{ mood: { hope: 0 }, words: ['declinata', 'vespertina', 'autumnalis', 'caduca', 'fugacia', 'relicta', 'occidens', 'ultima', 'senescens', 'deficiens', 'moriens', 'evanida', 'labens', 'peritura', 'cadens', 'antiqua', 'vetusta', 'obsoleta', 'exstincta', 'consumpta'] },
	{ mood: { joy: 0.5, tenderness: 0.8 }, words: ['pudica', 'modesta', 'casta', 'simplex', 'humilis', 'innocens', 'pia', 'grata', 'sincera', 'devota', 'fidelis', 'constans'] },
	{ mood: { energy: 0.8, hope: 0.8 }, words: ['invicta', 'triumphans', 'regnans', 'dominans', 'superba', 'magnifica', 'excelsa', 'sublimis', 'augusta', 'imperans', 'victrix', 'potens'] },
	{ mood: { clarity: 0.3, energy: 0.2 }, words: ['mystica', 'arcana', 'velata', 'occulta', 'cryptica', 'latens', 'recondita', 'enigmatica', 'abdita', 'operta', 'incognita', 'ignota'] },
	{ mood: { joy: 0.3, hope: 0.7, tenderness: 0.5 }, words: ['peregrina', 'migrans', 'errabunda', 'vagans', 'itinerans', 'viator', 'advena', 'hospita', 'aliena', 'exotica', 'rara', 'insolita'] }
];

// ── Common name building blocks ──

const commonPrefixes: { mood: Partial<MoodVector>; words: string[] }[] = [
	{ mood: { joy: 1 }, words: ['golden', 'sun', 'honey', 'bright', 'morning', 'laughing', 'dancing', 'shining', 'merry', 'sweet', 'cheerful', 'joyful', 'sunny', 'warm', 'amber', 'butter', 'saffron', 'marigold', 'copper', 'citrine', 'topaz', 'canary', 'gilt', 'gilded'] },
	{ mood: { joy: 0 }, words: ['ghost', 'shadow', 'ash', 'grey', 'weeping', 'fading', 'hollow', 'silent', 'lonely', 'pale', 'somber', 'mourning', 'wither', 'barren', 'bleak', 'dust', 'cinder', 'cobweb', 'phantom', 'specter', 'void', 'forgotten', 'forsaken', 'lost'] },
	{ mood: { energy: 1 }, words: ['fire', 'wild', 'storm', 'thunder', 'blaze', 'spark', 'fierce', 'crimson', 'flash', 'bold', 'dragon', 'hawk', 'tiger', 'scarlet', 'iron', 'flame', 'lightning', 'tempest', 'ember', 'magma', 'comet', 'solar', 'inferno', 'phoenix'] },
	{ mood: { energy: 0 }, words: ['moon', 'mist', 'cloud', 'snow', 'dream', 'dew', 'silk', 'feather', 'whisper', 'drift', 'lull', 'slumber', 'haze', 'gentle', 'cotton', 'pearl', 'moth', 'fog', 'still', 'quiet', 'twilight', 'shade', 'vapor', 'linen'] },
	{ mood: { tenderness: 1 }, words: ['velvet', 'rose', 'blush', 'maiden', 'heart', 'kiss', 'soft', 'petal', 'fairy', 'love', 'angel', 'swan', 'lace', 'dove', 'cherry', 'ribbon', 'coral', 'peach', 'satin', 'plum', 'rouge', 'sugar', 'nectar', 'honey'] },
	{ mood: { clarity: 1 }, words: ['crystal', 'glass', 'star', 'ice', 'diamond', 'mirror', 'silver', 'prism', 'clear', 'frost', 'quartz', 'opal', 'lunar', 'arctic', 'glacier', 'platinum', 'dagger', 'needle', 'flint', 'steel', 'chrome', 'mercury', 'mica', 'zircon'] },
	{ mood: { hope: 1 }, words: ['dawn', 'spring', 'first', 'young', 'new', 'rising', 'bloom', 'seedling', 'sprout', 'wish', 'waking', 'cradle', 'genesis', 'early', 'morning', 'fresh', 'ever', 'true', 'tender', 'green', 'renewal', 'promise', 'kindle', 'spark'] },
	{ mood: { hope: 0 }, words: ['dusk', 'autumn', 'last', 'winter', 'night', 'waning', 'ember', 'twilight', 'fallen', 'final', 'ruin', 'remnant', 'ending', 'husk', 'tatter', 'bone', 'rust', 'grave', 'crumble', 'wreck', 'thorn', 'wilt', 'decay', 'fossil'] },
	{ mood: { joy: 0.6, energy: 0.3, tenderness: 0.7 }, words: ['garden', 'meadow', 'bower', 'grove', 'valley', 'brook', 'glade', 'haven', 'dell', 'glen', 'copse', 'arbor'] },
	{ mood: { energy: 0.5, clarity: 0.7, hope: 0.6 }, words: ['north', 'wind', 'stone', 'river', 'mountain', 'cliff', 'peak', 'ridge', 'summit', 'crest', 'spire', 'tower'] },
	{ mood: { joy: 0.3, tenderness: 0.5, hope: 0.3 }, words: ['old', 'ancient', 'moss', 'lichen', 'oak', 'root', 'bark', 'sage', 'elder', 'relic', 'rune', 'myth'] },
	{ mood: { joy: 0.5, energy: 0.5, hope: 0.5 }, words: ['copper', 'bronze', 'jade', 'onyx', 'ruby', 'garnet', 'beryl', 'agate', 'jasper', 'lapis', 'cobalt', 'indigo'] }
];

const commonSuffixes = [
	'bell', 'drop', 'cup', 'bloom', 'blossom', 'lily', 'daisy', 'orchid',
	'poppy', 'lotus', 'aster', 'wort', 'vine', 'fern', 'thistle', 'moss',
	'tuft', 'crown', 'cap', 'brush', 'wisp', 'tear', 'puff', 'spike',
	'shade', 'cress', 'herb', 'leaf', 'briar', 'flower', 'rose', 'peony',
	'snapdragon', 'marigold', 'foxglove', 'primrose', 'buttercup', 'clover',
	'yarrow', 'sorrel', 'tansy', 'nettle', 'mint', 'sage', 'thyme', 'rue',
	'anemone', 'dahlia', 'zinnia', 'iris', 'crocus', 'tulip', 'wisteria',
	'jasmine', 'heather', 'lavender', 'violet', 'pansy', 'begonia', 'camellia',
	'weed', 'stalk', 'frond', 'thorn', 'sprout', 'bud', 'seed', 'pod',
	'petal', 'stem', 'reed', 'rush', 'sedge', 'heath', 'spur', 'cane',
	'berry', 'fruit', 'husk', 'bark', 'root', 'bulb', 'lichen', 'spore',
	'bower', 'wreath', 'garland', 'plume', 'lace', 'veil', 'dew', 'mote'
];

// ── Poetic / folkloric name fragments ──

const poeticTitles = [
	"the wanderer's", "the dreamer's", "the mourner's", "the maiden's",
	"the shepherd's", "the witch's", "the poet's", "the child's",
	"the queen's", "the hermit's", "the pilgrim's", "the lover's",
	"the widow's", "the knight's", "the oracle's", "the stranger's",
	"the keeper's", "the weaver's", "the singer's", "the dancer's",
	"the sailor's", "the tinker's", "the beggar's", "the scholar's",
	"the hunter's", "the healer's", "the painter's", "the thief's",
	"the prophet's", "the fool's", "the king's", "the ghost's",
	"the miller's", "the baker's", "the mason's", "the gardener's",
	"the cobbler's", "the brewer's", "the tailor's", "the scribe's"
];

const poeticPlaces = [
	'of the hollow', 'of the vale', 'of the deep', 'of the heights',
	'of the moor', 'of the fen', 'of the ridge', 'of the glade',
	'of the marsh', 'of the wood', 'of the dell', 'of the glen',
	'of the shore', 'of the cliff', 'of the meadow', 'of the dunes',
	'of the gorge', 'of the tarn', 'of the bluff', 'of the cove',
	'of the tor', 'of the heath', 'of the copse', 'of the firth',
	'of the steppe', 'of the grove', 'of the weald', 'of the fjord',
	'of the basin', 'of the pass', 'of the cairn', 'of the knoll'
];

const mythicNames = [
	'Elowen', 'Isolde', 'Linnea', 'Ondine', 'Thisbe', 'Calyx', 'Nyssa',
	'Azalea', 'Ione', 'Daphne', 'Calla', 'Acacia', 'Briar', 'Wren',
	'Asphodel', 'Amaranth', 'Oleander', 'Jessamine', 'Clematis', 'Hellebore',
	'Aconite', 'Belladonna', 'Artemisia', 'Lorelei', 'Seraphina', 'Ophelia',
	'Sable', 'Vesper', 'Soleil', 'Lunaria', 'Stellaria', 'Edelweiss',
	'Cereus', 'Zinnia', 'Forsythia', 'Anemone', 'Calanthe', 'Diantha',
	'Elara', 'Freesia', 'Galanthus', 'Hyacinth', 'Iolanthe', 'Jacinth',
	'Kalina', 'Liatris', 'Melilot', 'Nigella', 'Oxalis', 'Petunia',
	'Quillaia', 'Reseda', 'Silene', 'Tanaceta', 'Ulex', 'Verbena',
	'Xanthia', 'Yucca', 'Zelkova', 'Arethusa', 'Boronia', 'Coreopsis',
	'Diosma', 'Echium', 'Felicia', 'Gerbera', 'Hespera', 'Idesia',
	'Jaborosa', 'Kerria', 'Lobelia', 'Mimosa', 'Nerine', 'Oenothera',
	'Protea', 'Ranunculus', 'Scabiosa', 'Thunbergia', 'Urtica', 'Vinca',
	'Watsonia', 'Xeranthemum', 'Ylangia', 'Zamia', 'Althea', 'Bryonia',
	'Calliope', 'Desdemona', 'Eurydice', 'Fiora', 'Galadriel', 'Hesperis',
	'Illyria', 'Junifera', 'Kalmia', 'Leucothoe', 'Meliora', 'Nyctera',
	'Orabella', 'Persephone', 'Quintessa', 'Rosalinde', 'Sylvaine', 'Tempestia',
	'Umbrielle', 'Valenthia', 'Willowmere', 'Xanthe', 'Yvaine', 'Zephyrine'
];

// ── Epithets for mythic names (not species — more evocative) ──

const mythicEpithets: { mood: Partial<MoodVector>; words: string[] }[] = [
	{ mood: { joy: 1 }, words: ['the radiant', 'the gilded', 'the sunlit', 'the golden', 'the luminous', 'the bright', 'the gleaming', 'the resplendent'] },
	{ mood: { joy: 0 }, words: ['the pale', 'the fading', 'the silent', 'the hollow', 'the grey', 'the forsaken', 'the dimming', 'the mournful'] },
	{ mood: { energy: 1 }, words: ['the fierce', 'the blazing', 'the untamed', 'the wild', 'the burning', 'the tempestuous', 'the relentless', 'the thunderous'] },
	{ mood: { energy: 0 }, words: ['the drowsy', 'the still', 'the sleeping', 'the hushed', 'the gentle', 'the dreaming', 'the quiet', 'the restful'] },
	{ mood: { tenderness: 1 }, words: ['the tender', 'the beloved', 'the gentle', 'the soft', 'the cherished', 'the graceful', 'the dear', 'the sweet'] },
	{ mood: { clarity: 1 }, words: ['the crystalline', 'the lucid', 'the keen', 'the piercing', 'the pristine', 'the immaculate', 'the flawless', 'the unbroken'] },
	{ mood: { hope: 1 }, words: ['the evergreen', 'the enduring', 'the steadfast', 'the undying', 'the eternal', 'the reborn', 'the ascending', 'the awakened'] },
	{ mood: { hope: 0 }, words: ['the withering', 'the last', 'the forgotten', 'the crumbling', 'the dying', 'the ancient', 'the ruined', 'the vanishing'] }
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

const connectors = [
	'ri', 'li', 'ni', 'mi', 'si', 'ra', 'la', 'na', 'ma', 'sa',
	'ro', 'lo', 'no', 'mo', 'so', 'ti', 'di', 'vi', 'phi', 'chi',
	'ber', 'der', 'ter', 'ger', 'per', 'ven', 'den', 'men', 'sen', 'len',
	'cor', 'for', 'gor', 'hor', 'lor', 'mor', 'nor', 'por', 'sor', 'tor',
	'ban', 'can', 'dan', 'fan', 'gan', 'han', 'jan', 'kan', 'pan', 'ran',
	'bel', 'cel', 'del', 'fel', 'gel', 'hel', 'kel', 'mel', 'nel', 'vel'
];

function generateGenusName(mood: MoodVector, rng: () => number): string {
	const scored = syllablePools
		.map((pool) => ({ pool, score: scoreMoodMatch(mood, pool.mood) }))
		.sort((a, b) => b.score - a.score);

	const top = scored.slice(0, 5);
	const total = top.reduce((s, t) => s + t.score, 0);

	function pickPool(): SyllablePool {
		let r = rng() * total;
		for (const { pool, score } of top) {
			r -= score;
			if (r <= 0) return pool;
		}
		return top[0].pool;
	}

	const syllableCount = rng() < 0.2 ? 2 : rng() < 0.7 ? 3 : 4;
	let name = '';

	for (let i = 0; i < syllableCount; i++) {
		const pool = pickPool();
		if (i === 0) {
			name += pool.onset[Math.floor(rng() * pool.onset.length)];
			name += pool.nucleus[Math.floor(rng() * pool.nucleus.length)];
		} else if (i === syllableCount - 1) {
			name += pool.coda[Math.floor(rng() * pool.coda.length)];
		} else {
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
	if (roll < 0.35) {
		// "Goldenblossom"
		return capitalize(prefix) + suffix;
	} else if (roll < 0.6) {
		// "Golden Blossom"
		return capitalize(prefix) + ' ' + capitalize(suffix);
	} else if (roll < 0.75) {
		// "Golden-blossom"
		return capitalize(prefix) + '-' + suffix;
	} else if (roll < 0.88) {
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

	// Use seed bits to deterministically pick a format — more entropy than a single roll
	const r1 = rng();
	const r2 = rng();
	const formatIndex = Math.floor((r1 + r2 * 0.01) * 12) % 12;

	switch (formatIndex) {
		case 0: {
			// Botanical binomial: "Floresia aurea"
			const genus = generateGenusName(mood, rng);
			const species = weightedPick(rng, speciesWords, mood);
			return `${genus} ${species}`;
		}
		case 1: {
			// Common name compound: "Goldenblossom"
			return generateCommonName(mood, rng);
		}
		case 2: {
			// Common + binomial: "Sunlily (Claresia vivida)"
			const common = generateCommonName(mood, rng);
			const genus = generateGenusName(mood, rng);
			const species = weightedPick(rng, speciesWords, mood);
			return `${common} (${genus} ${species})`;
		}
		case 3: {
			// Genus only: "Velumosa"
			return generateGenusName(mood, rng);
		}
		case 4: {
			// Mythic + epithet: "Elowen the Radiant"
			const myth = pick(rng, mythicNames);
			const epithet = weightedPick(rng, mythicEpithets, mood);
			return `${myth}, ${epithet}`;
		}
		case 5: {
			// Mythic + species: "Isolde pallida"
			const myth = pick(rng, mythicNames);
			const species = weightedPick(rng, speciesWords, mood);
			return `${myth} ${species}`;
		}
		case 6: {
			// Folkloric: "The Wanderer's Orchid"
			const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
			const title = pick(rng, poeticTitles);
			const suffix = pick(rng, commonSuffixes);
			return capitalize(title) + ' ' + capitalize(suffix);
		}
		case 7: {
			// Place-bound mythic: "Lunaria of the Hollow"
			const myth = pick(rng, mythicNames);
			const place = pick(rng, poeticPlaces);
			return `${myth} ${place}`;
		}
		case 8: {
			// Double genus: "Floresia × Velumis" (hybrid notation)
			const g1 = generateGenusName(mood, rng);
			const g2 = generateGenusName(mood, rng);
			return `${g1} \u00d7 ${g2}`;
		}
		case 9: {
			// Titled genus: "Floresia, the evergreen"
			const genus = generateGenusName(mood, rng);
			const epithet = weightedPick(rng, mythicEpithets, mood);
			return `${genus}, ${epithet}`;
		}
		case 10: {
			// Common name + place: "Moonlily of the Fen"
			const prefix = weightedPick(rng, commonPrefixes, mood);
			const suffix = pick(rng, commonSuffixes);
			const place = pick(rng, poeticPlaces);
			const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
			return capitalize(prefix) + suffix + ' ' + place;
		}
		case 11:
		default: {
			// Full botanical with common: "Fireblossom (Krixor ignea var. tempesta)"
			const common = generateCommonName(mood, rng);
			const genus = generateGenusName(mood, rng);
			const species = weightedPick(rng, speciesWords, mood);
			const variety = weightedPick(rng, speciesWords, mood);
			return `${common} (${genus} ${species} var. ${variety})`;
		}
	}
}
