<script lang="ts">
	import { selectedFlower, entries, cursorDefault, cursorPointer, isAdmin } from '$lib/stores/garden.js';
	import { fade, fly } from 'svelte/transition';
	import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
	import { renderFlower } from '$lib/generation/PixelArtRenderer.js';
	import { marked } from 'marked';
	import { mulberry32 } from '$lib/generation/SeededRandom.js';
	import { env } from '$env/dynamic/public';

	const OWNER_TZ = env.PUBLIC_OWNER_TIMEZONE || 'America/Toronto';

	const OWNER_TZ_LABEL = env.PUBLIC_OWNER_TIMEZONE_LABEL || 'Toronto';

	let visible = $derived($selectedFlower !== null);
	let entry = $derived($selectedFlower);
	let displayedText = $state('');
	let glowColor = $state('rgba(255,255,255,0.3)');
	let petalColor = $state('#aaaaaa');
	let glowTop = $state('40%');
	let revealTimer: ReturnType<typeof setTimeout> | null = null;
	let showTags = $state(false);
	let smellCount = $state(0);
	let smelled = $state(false);
	let smelling = $state(false);
	let smellToast = $state<string | null>(null);
	let embedLoadTimer: ReturnType<typeof setTimeout> | null = null;
	let smellToastTimer: ReturnType<typeof setTimeout> | null = null;
	let starred = $state(false);
	let starring = $state(false);
	let linkCopied = $state(false);
	let linkCopiedTimer: ReturnType<typeof setTimeout> | null = null;
	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let flowerCanvas: HTMLCanvasElement;
	let flowerSideEl: HTMLDivElement;
	let textSideHeight = $state('auto');
	let mobileStep = $state(0);
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
		if (dx < 0 && mobileStep === 0) mobileStep = 1;
		else if (dx > 0 && mobileStep === 1) mobileStep = 0;
	}

	// ─── Song playback via Spotify embed ───
	let songPlaying = $state(false);
	let embedReady = $state(false);
	let embedController: any = null;
	let embedContainer: HTMLDivElement | null = null;

	// Eagerly load the Spotify IFrame API script and capture it via a global promise.
	// The callback must be set BEFORE the script loads to avoid a race condition
	// where the script fires onSpotifyIframeApiReady before ensureSpotifyApi() is called.
	if (typeof window !== 'undefined' && !(window as any)._spotifyApiPromise) {
		(window as any)._spotifyApiPromise = new Promise<any>((resolve) => {
			if ((window as any).SpotifyIframeApi) {
				resolve((window as any).SpotifyIframeApi);
				return;
			}
			const prev = (window as any).onSpotifyIframeApiReady;
			(window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
				(window as any).SpotifyIframeApi = IFrameAPI;
				prev?.(IFrameAPI);
				resolve(IFrameAPI);
			};
			if (!document.querySelector('script[src*="spotify.com/embed"]')) {
				const s = document.createElement('script');
				s.src = 'https://open.spotify.com/embed/iframe-api/v1';
				s.async = true;
				document.head.appendChild(s);
			}
		});
	}

	function ensureSpotifyApi(): Promise<any> {
		return (window as any)._spotifyApiPromise || Promise.reject(new Error('Spotify API not initialized'));
	}

	let wantsPlay = $state(false);

	/** Silently preload embed in background (no auto-play). */
	function preloadEmbed(trackId: string) {
		destroyEmbed();
		const container = document.createElement('div');
		container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none';
		document.body.appendChild(container);
		embedContainer = container;

		ensureSpotifyApi().then((IFrameAPI) => {
			if (!embedContainer || embedContainer !== container) return;
			IFrameAPI.createController(container, {
				uri: `spotify:track:${trackId}`,
				width: 1,
				height: 1,
			}, (controller: any) => {
				if (embedContainer !== container) { try { controller.destroy(); } catch {} return; }
				embedController = controller;
				embedReady = true;
				controller.addListener('playback_update', (e: any) => {
					songPlaying = !e.data.isPaused;
				});
				// If user already clicked play while we were loading, start now
				if (wantsPlay) {
					wantsPlay = false;
					controller.play();
				}
			});
		});
	}

	function toggleSong() {
		if (embedController) {
			embedController.togglePlay();
			return;
		}
		// Embed still loading — flag it to auto-play when ready
		wantsPlay = true;
	}

	function destroyEmbed() {
		if (embedController) {
			try { embedController.destroy(); } catch {}
			embedController = null;
		}
		if (embedContainer) {
			try { embedContainer.remove(); } catch {}
			embedContainer = null;
		}
		songPlaying = false;
		embedReady = false;
	}

	const FLOWER_SCALE = 5;

	const weatherSvgs: Record<string, string> = {
		sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
		'cloud-sun': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M20 12h2"/><path d="M17.66 4.93l-1.41 1.41"/><path d="M2 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M18 10a4 4 0 00-7.46-2"/><path d="M17.5 19a4.5 4.5 0 10-7.42-4.97A3.5 3.5 0 006 17.5 3.5 3.5 0 009.5 21h8a3 3 0 000-6z" fill="currentColor" opacity="0.15"/><path d="M17.5 19a4.5 4.5 0 10-7.42-4.97A3.5 3.5 0 006 17.5 3.5 3.5 0 009.5 21h8a3 3 0 000-6z"/></svg>',
		cloud: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>',
		rain: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 13V5a4 4 0 00-8 0v.2A5 5 0 004 10a5 5 0 005 5h7a4 4 0 000-8z"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="17" x2="12" y2="19"/><line x1="16" y1="19" x2="16" y2="21"/></svg>',
		snow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="8" y1="20" x2="8" y2="20.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="12" y1="22" x2="12" y2="22.01"/><line x1="16" y1="16" x2="16" y2="16.01"/><line x1="16" y1="20" x2="16" y2="20.01"/></svg>',
		storm: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',
	};

	function getWeatherSvg(icon: string): string {
		return weatherSvgs[icon] || weatherSvgs['cloud-sun'] || icon;
	}

	marked.setOptions({ breaks: true, gfm: true });

	let renderedHtml = $derived(displayedText ? marked.parse(displayedText) as string : '');

	const moodAxes = [
		{ key: 'joy' as const, label: 'Joy', left: '#78909c', right: '#ffd54f' },
		{ key: 'energy' as const, label: 'Energy', left: '#b0bec5', right: '#ff7043' },
		{ key: 'tenderness' as const, label: 'Tenderness', left: '#90a4ae', right: '#f48fb1' },
		{ key: 'clarity' as const, label: 'Clarity', left: '#78909c', right: '#4fc3f7' },
		{ key: 'hope' as const, label: 'Hope', left: '#616161', right: '#ffcc02' },
	];

	$effect(() => {
		const currentEntry = entry;
		if (currentEntry) {
			if (flowerCanvas) {
				const dna = generateFlowerDNA(currentEntry.mood, currentEntry.flowerSeed);
				const rendered = renderFlower(dna);
				const w = rendered.width;
				const h = rendered.height;
				const px = rendered.pixels;

				let topY = 0;
				let bottomY = h - 1;
				for (let y = 0; y < h; y++) {
					let hasPixel = false;
					for (let x = 0; x < w; x++) {
						if (px[(y * w + x) * 4 + 3] > 0) { hasPixel = true; break; }
					}
					if (hasPixel) { topY = y; break; }
				}
				for (let y = h - 1; y >= topY; y--) {
					let hasPixel = false;
					for (let x = 0; x < w; x++) {
						if (px[(y * w + x) * 4 + 3] > 0) { hasPixel = true; break; }
					}
					if (hasPixel) { bottomY = y; break; }
				}

				topY = Math.max(0, topY - 1);
				const croppedH = bottomY - topY + 2;

				const headCenter = Math.round((croppedH * 0.35));
				glowTop = `${(headCenter / croppedH) * 100}%`;

				flowerCanvas.width = w * FLOWER_SCALE;
				flowerCanvas.height = croppedH * FLOWER_SCALE;
				const ctx = flowerCanvas.getContext('2d')!;
				ctx.imageSmoothingEnabled = false;

				const tmp = document.createElement('canvas');
				tmp.width = w;
				tmp.height = h;
				const tmpCtx = tmp.getContext('2d')!;
				const pixelData = new Uint8ClampedArray(px.length);
				pixelData.set(px);
				const imageData = new ImageData(
					pixelData as unknown as Uint8ClampedArray<ArrayBuffer>,
					w,
					h
				);
				tmpCtx.putImageData(imageData, 0, 0);
				ctx.clearRect(0, 0, flowerCanvas.width, flowerCanvas.height);
				ctx.drawImage(
					tmp,
					0, topY, w, croppedH,
					0, 0, flowerCanvas.width, flowerCanvas.height
				);

				const [c1] = dna.petalColors;
				petalColor = c1;
				glowColor = `${c1}30`;

				requestAnimationFrame(() => {
					if (flowerSideEl) {
						textSideHeight = `${flowerSideEl.offsetHeight}px`;
					}
				});
			}

			displayedText = '';
			showTags = false;
			smellCount = currentEntry.smells || 0;
			smelled = false;
			smellToast = null;
			mobileStep = 0;
			starred = currentEntry.isStarred || false;
			if (smellToastTimer) clearTimeout(smellToastTimer);
			revealTimer = setTimeout(() => {
				displayedText = currentEntry.text;
				setTimeout(() => { showTags = true; }, 500);
			}, 300);

			destroyEmbed();
			wantsPlay = false;
			// Preload embed after card animation settles so play is instant
			if (currentEntry.song) {
				if (embedLoadTimer) clearTimeout(embedLoadTimer);
				embedLoadTimer = setTimeout(() => {
					if (entry?.song?.trackId === currentEntry.song!.trackId) {
						preloadEmbed(currentEntry.song!.trackId);
					}
				}, 600);
			}
		}
		return () => {
			if (revealTimer) clearTimeout(revealTimer);
			if (embedLoadTimer) clearTimeout(embedLoadTimer);
			destroyEmbed();
		};
	});

	function generateScent(mood: import('$lib/types.js').MoodVector, seed: number): string {
		const rng = mulberry32(seed + 9999);
		const scents: { check: () => boolean; words: string[] }[] = [
			{ check: () => mood.joy > 0.7, words: [
				'warm honey', 'sun-ripened peaches', 'sweet citrus', 'fresh buttercream', 'golden nectar',
				'melted caramel', 'ripe mangoes', 'sunflower fields', 'orange blossom', 'toasted marshmallow',
				'brown sugar', 'apricot jam', 'clementine zest', 'pineapple sorbet', 'candied ginger'
			]},
			{ check: () => mood.joy < 0.3, words: [
				'damp earth after rain', 'old paper', 'cold stone', 'dried lavender', 'faint smoke',
				'wet clay', 'forgotten libraries', 'grey mornings', 'rusted iron', 'driftwood',
				'rain on concrete', 'empty rooms', 'weathered leather', 'cold ash', 'dried ink'
			]},
			{ check: () => mood.energy > 0.7, words: [
				'crushed ginger', 'black pepper', 'wild mint', 'fresh pine', 'bright lemongrass',
				'cracked cinnamon', 'espresso beans', 'blood orange', 'juniper berries', 'electric ozone',
				'raw cardamom', 'chili flakes', 'birch sap', 'sharp rosemary', 'thunderstorm air'
			]},
			{ check: () => mood.energy < 0.3, words: [
				'chamomile tea', 'soft vanilla', 'warm milk', 'cotton sheets', 'distant jasmine',
				'sleepy lavender', 'slow honey', 'fading embers', 'old quilts', 'powdered sugar',
				'warm rice', 'barely-there musk', 'hushed linen', 'still water', 'drowsy sage'
			]},
			{ check: () => mood.tenderness > 0.7, words: [
				'rose petals', 'cherry blossoms', 'sweet pea', 'soft peony', 'warm skin',
				'fresh lilac', 'baby powder', 'honeysuckle dew', 'magnolia', 'silk ribbon',
				'pink peppercorn', 'sugar plum', 'blush wine', 'tender violets', 'cashmere'
			]},
			{ check: () => mood.tenderness < 0.3, words: [
				'cedar bark', 'iron filings', 'cold metal', 'morning frost', 'dry sage',
				'granite dust', 'frozen pine', 'steel wool', 'bare concrete', 'dry wind',
				'cracked leather', 'raw flint', 'winter bark', 'slate', 'cold brass'
			]},
			{ check: () => mood.clarity > 0.7, words: [
				'eucalyptus', 'fresh snow', 'clean linen', 'sea glass', 'crystal water',
				'white tea', 'arctic air', 'cucumber', 'starched cotton', 'clear quartz',
				'ice melt', 'morning stream', 'mint frost', 'polished glass', 'alpine wind'
			]},
			{ check: () => mood.clarity < 0.3, words: [
				'incense smoke', 'old perfume', 'fog and moss', 'distant campfire', 'wet wool',
				'amber resin', 'temple wood', 'tobacco leaf', 'twilight mist', 'opium flower',
				'patchouli', 'dark myrrh', 'smoky quartz', 'faded sandalwood', 'velvet shadows'
			]},
			{ check: () => mood.hope > 0.7, words: [
				'spring rain', 'new leaves', 'morning dew', 'fresh-cut grass', 'warm bread',
				'first bloom', 'green tea', 'wet soil at dawn', 'apple blossoms', 'open windows',
				'seedling roots', 'clover honey', 'garden after rain', 'dandelion wisps', 'sunrise mist'
			]},
			{ check: () => mood.hope < 0.3, words: [
				'autumn leaves', 'dried roses', 'candle wax', 'dusty velvet', 'cold tea',
				'fading ink', 'pressed flowers', 'old photographs', 'burnt sugar', 'empty vases',
				'November fog', 'forgotten letters', 'melted snow', 'silent rooms', 'moth wings'
			]},
			{ check: () => mood.joy > 0.4 && mood.tenderness > 0.4, words: [
				'strawberry fields', 'warm cinnamon rolls', 'birthday cake', 'sun on bare shoulders',
				'ripe berries', 'spun sugar', 'tangerine dreams', 'plum blossoms', 'soft caramel'
			]},
			{ check: () => mood.energy > 0.4 && mood.clarity > 0.4, words: [
				'lightning and rain', 'sharp cedar', 'ocean spray', 'mountain summit',
				'frozen waterfall', 'crisp apple', 'cold river stones', 'snapped twig', 'winter sun'
			]},
			{ check: () => mood.hope > 0.4 && mood.joy > 0.4, words: [
				'wildflower meadow', 'lemon verbena', 'coconut milk', 'peach blossoms',
				'warm sand', 'jasmine at dusk', 'ripening figs', 'marigold petals', 'sunlit honey'
			]},
			{ check: () => mood.tenderness > 0.4 && mood.hope > 0.4, words: [
				'sleeping gardens', 'moonlit petals', 'lavender dreams', 'warm amber',
				'soft rain on leaves', 'wisteria', 'lily of the valley', 'sweet almond', 'night-blooming jasmine'
			]},
		];
		const matching = scents.filter((s) => s.check());
		if (matching.length === 0) matching.push(scents[0]);
		const pool = matching[Math.floor(rng() * matching.length)];
		return pool.words[Math.floor(rng() * pool.words.length)];
	}

	async function handleSmell() {
		if (!entry) return;
		if (smelled) {
			const scent = generateScent(entry.mood, entry.flowerSeed);
			smellToast = `${entry.flowerName} smells like ${scent}`;
			if (smellToastTimer) clearTimeout(smellToastTimer);
			smellToastTimer = setTimeout(() => { smellToast = null; }, 3000);
			return;
		}
		if (smelling) return;
		smelling = true;
		try {
			const res = await fetch(`/api/entries/${entry.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'smell' })
			});
			if (res.ok) {
				const data = await res.json();
				smellCount = data.smells;
				smelled = true;
				entries.update((all) =>
					all.map((e) => (e.id === entry!.id ? { ...e, smells: data.smells } : e))
				);
				// Show toast
				const scent = generateScent(entry!.mood, entry!.flowerSeed);
				smellToast = `you smelled ${entry!.flowerName} — it smells like ${scent}`;
				if (smellToastTimer) clearTimeout(smellToastTimer);
				smellToastTimer = setTimeout(() => { smellToast = null; }, 4000);
			}
		} catch {}
		smelling = false;
	}

	async function handleStar() {
		if (!entry || starring) return;
		starring = true;
		try {
			const res = await fetch(`/api/entries/${entry.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'star' })
			});
			if (res.ok) {
				const data = await res.json();
				starred = data.isStarred;
				entries.update((all) =>
					all.map((e) => (e.id === entry!.id ? { ...e, isStarred: data.isStarred } : e))
				);
			}
		} catch {}
		starring = false;
	}

	async function handleCopyLink() {
		if (!entry) return;
		const url = `${window.location.origin}/flower/${entry.id}`;
		try {
			await navigator.clipboard.writeText(url);
			linkCopied = true;
			if (linkCopiedTimer) clearTimeout(linkCopiedTimer);
			linkCopiedTimer = setTimeout(() => { linkCopied = false; }, 2000);
		} catch {}
	}

	function exportFlowerCard() {
		if (!entry) return;
		const dna = generateFlowerDNA(entry.mood, entry.flowerSeed);
		const rendered = renderFlower(dna);
		const scale = 8;
		const cardW = 400;
		const cardH = 480;
		const c = document.createElement('canvas');
		c.width = cardW;
		c.height = cardH;
		const ctx = c.getContext('2d')!;

		// Background gradient from petal colors
		const color1 = dna.petalColors[0];
		const color2 = dna.petalColors[1];
		const grad = ctx.createRadialGradient(cardW / 2, cardH * 0.4, 40, cardW / 2, cardH * 0.4, cardW * 0.7);
		grad.addColorStop(0, color1 + '40');
		grad.addColorStop(1, color2 + '15');
		ctx.fillStyle = '#1a1a2e';
		ctx.fillRect(0, 0, cardW, cardH);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, cardW, cardH);

		// Render flower pixels
		const fw = rendered.width * scale;
		const fh = rendered.height * scale;
		const fx = (cardW - fw) / 2;
		const fy = 30;
		const imgData = ctx.createImageData(rendered.width, rendered.height);
		imgData.data.set(rendered.pixels);
		const tmpC = document.createElement('canvas');
		tmpC.width = rendered.width;
		tmpC.height = rendered.height;
		tmpC.getContext('2d')!.putImageData(imgData, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(tmpC, fx, fy, fw, fh);

		// Flower name
		ctx.font = '20px "Darumadrop One", cursive';
		ctx.fillStyle = 'rgba(255,255,255,0.85)';
		ctx.textAlign = 'center';
		ctx.fillText(entry.flowerName, cardW / 2, cardH - 40);

		// Download
		const a = document.createElement('a');
		a.href = c.toDataURL('image/png');
		a.download = `${entry.flowerName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
		a.click();
	}

	function close() {
		destroyEmbed();
		selectedFlower.set(null);
		displayedText = '';
		showTags = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (lightboxOpen) { lightboxOpen = false; return; }
			close();
		}
		if (lightboxOpen && entry?.images) {
			if (e.key === 'ArrowLeft') lightboxIndex = (lightboxIndex - 1 + entry.images.length) % entry.images.length;
			if (e.key === 'ArrowRight') lightboxIndex = (lightboxIndex + 1) % entry.images.length;
		}
	}

	function formatDateLine(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Detect if visitor is in the same timezone as the owner
	const visitorTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : OWNER_TZ;
	const isOwnerTz = visitorTz === OWNER_TZ;

	/** Get today's date string in the owner's timezone */
	function ownerToday(): string {
		return new Date().toLocaleDateString('en-CA', { timeZone: OWNER_TZ });
	}

	function relativeDate(dateStr: string): string | null {
		const todayStr = ownerToday();
		if (dateStr === todayStr) return 'today';
		// Compute days difference using parsed dates
		const entryDate = new Date(dateStr + 'T00:00:00');
		const todayDate = new Date(todayStr + 'T00:00:00');
		const diffDays = Math.round((todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays === 1) return 'yesterday';
		if (diffDays >= 2 && diffDays <= 7) return `${diffDays} days ago`;
		return null;
	}

	function flowerAge(dateStr: string): string {
		const all = $entries;
		const isFirst = all.length > 0 && all.reduce((oldest, e) => e.date < oldest.date ? e : oldest).id === entry?.id;
		if (isFirst && all.length > 1) return 'the first flower in the garden';
		const entryDate = new Date(dateStr + 'T00:00:00');
		const todayDate = new Date(ownerToday() + 'T00:00:00');
		const diffDays = Math.round((todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays <= 0) return 'planted today';
		if (diffDays === 1) return 'planted yesterday';
		if (diffDays < 30) return `${diffDays} days old`;
		const months = Math.floor(diffDays / 30.44);
		if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`;
		const years = Math.floor(months / 12);
		const rem = months % 12;
		if (rem === 0) return `growing for ${years} year${years === 1 ? '' : 's'}`;
		return `growing for ${years} year${years === 1 ? '' : 's'} and ${rem} month${rem === 1 ? '' : 's'}`;
	}

	/** Format time in owner's timezone. Appends TZ abbreviation (EST/EDT) for visitors. */
	function formatTimeOwner(createdAt: number): string {
		const t = new Date(createdAt);
		const time = t.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: OWNER_TZ
		});
		if (isOwnerTz) return time;
		// Get timezone abbreviation (e.g. "EST" or "EDT")
		const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: OWNER_TZ, timeZoneName: 'short' })
			.formatToParts(t)
			.find((p) => p.type === 'timeZoneName')?.value || OWNER_TZ_LABEL;
		return `${time} ${tzAbbr}`;
	}

	/** Format time in the visitor's local timezone (for hover tooltip). */
	function formatTimeLocal(createdAt: number): string {
		if (isOwnerTz) return '';
		const t = new Date(createdAt);
		return t.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZoneName: 'short'
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible && entry}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" style="cursor:{$cursorDefault};--link-color:{petalColor};--cursor-pointer:{$cursorPointer}" transition:fade={{ duration: 300 }} onclick={close}>
		<div class="reveal-card" transition:fly={{ y: 30, duration: 400 }} onclick={(e) => e.stopPropagation()}>
			<div class="top-bar">
				<span class="top-date">{formatDateLine(entry.date)}</span>
				<button class="smell-btn" class:smelled onclick={handleSmell} disabled={smelling}>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 20c-4 0-7-2.5-7-6 0-4 3-6 5-9 .4-.6 1.2-.6 1.6-.1l.4.5c2 3 5 5 5 8.6 0 3.5-3 6-5 6z"/>
					</svg>
					<span class="smell-count">{smellCount}</span>
				</button>
				{#if $isAdmin}
					<button class="star-btn" class:starred onclick={handleStar} disabled={starring} aria-label={starred ? 'Unstar flower' : 'Star flower'}>
						<svg viewBox="0 0 24 24" width="14" height="14" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
						</svg>
					</button>
				{/if}
				<div class="top-meta">
					{#if relativeDate(entry.date)}
						<span class="meta-tag">{relativeDate(entry.date)}</span>
					{/if}
					<span class="meta-tag time-tag" title={formatTimeLocal(entry.createdAt) || ''}>{formatTimeOwner(entry.createdAt)}</span>
					{#if entry.weather}
						<span class="meta-tag weather-tag">{@html getWeatherSvg(entry.weather.icon)} {entry.weather.temp}°C</span>
					{/if}
				</div>
				<button class="close-btn" onclick={close} aria-label="Close">&times;</button>
			</div>

			<div class="card-body">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="panels" style="--step:{mobileStep}" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
				<div class="panel panel-flower-view" bind:this={flowerSideEl}>
					<div class="flower-display">
						<div class="flower-glow" style="background: {glowColor}; top: {glowTop}"></div>
						<canvas
							bind:this={flowerCanvas}
							class="flower-canvas"
						></canvas>
					</div>
					<div class="flower-name">{entry.flowerName}</div>
					<div class="flower-age">{flowerAge(entry.date)}</div>

					<div class="mood-bars">
						{#each moodAxes as axis}
							<div class="mood-row">
								<span class="mood-label">{axis.label}</span>
								<div class="mood-track">
									<div
										class="mood-fill"
										style="width: {entry.mood[axis.key] * 100}%; background: linear-gradient(to right, {axis.left}, {axis.right})"
									></div>
								</div>
							</div>
						{/each}
					</div>

					{#if entry.song}
						<div class="song-section">
							<span class="song-heading">listening to</span>
							<div class="song-card">
								<img src={entry.song.albumArt} alt="" class="song-art" />
								<div class="song-meta">
									<span class="song-title">{entry.song.title}</span>
									<span class="song-artist">{entry.song.artist}</span>
								</div>
								<button class="song-play-btn" class:playing={songPlaying} onclick={toggleSong} aria-label={songPlaying ? 'Pause' : 'Play'}>
									{#if songPlaying}
										<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
									{:else}
										<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
									{/if}
								</button>
								<a href={entry.song.spotifyUrl} target="_blank" rel="noopener noreferrer" class="song-link" aria-label="Open on Spotify">
									<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
								</a>
							</div>
						</div>
					{/if}
				</div>

				<div class="panel panel-text-view" style="max-height: {textSideHeight}">
				<div class="text-inner">
					{#if entry.title}
						<h2 class="entry-title">{entry.title}</h2>
					{/if}

					{#if entry.images && entry.images.length > 0}
						<div class="image-strip">
							{#each entry.images.slice(0, 2) as img, i}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<div class="img-wrap">
								<img
									src="/api/images/{img}"
									alt=""
									class="strip-img"
									onload={(e) => { (e.currentTarget as HTMLElement).parentElement!.classList.add('img-loaded'); }}
									onclick={(e) => { e.stopPropagation(); lightboxIndex = i; lightboxOpen = true; }}
								/>
							</div>
							{/each}
							{#if entry.images.length > 2}
								<button class="more-images" onclick={(e) => { e.stopPropagation(); lightboxIndex = 0; lightboxOpen = true; }}>
									+{entry.images.length - 2} more
								</button>
							{/if}
						</div>
					{/if}

					{#if renderedHtml}
						<div class="journal-text" transition:fade={{ duration: 600 }}>
							{@html renderedHtml}
						</div>
					{/if}

					<div class="bottom-row" transition:fade={{ duration: 400 }}>
						{#if showTags && entry.tags && entry.tags.length > 0}
							<div class="tags">
								{#each entry.tags as tag}
									<span class="tag">{tag}</span>
								{/each}
							</div>
						{/if}
						<div class="action-btns">
							<button class="share-btn" onclick={handleCopyLink} aria-label="Share">
								{#if linkCopied}
									<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
									<span class="btn-label">copied</span>
								{:else}
									<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
									<span class="btn-label btn-label-secondary">share</span>
								{/if}
							</button>
							<button class="share-btn" onclick={exportFlowerCard} aria-label="Save">
								<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								<span class="btn-label">save</span>
							</button>
						</div>
					</div>
				</div>
				</div>
				</div>
			</div>

			<!-- Mobile footer with step navigation -->
			<div class="card-footer mobile-footer">
				<div class="footer-slot footer-left">
					{#if mobileStep === 1}
						<button class="nav-btn" transition:fade={{ duration: 200 }} onclick={() => (mobileStep = 0)}>
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
							read
						</button>
					{/if}
				</div>
				<div class="step-dots">
					<span class="dot" class:active={mobileStep === 0}></span>
					<span class="dot" class:active={mobileStep === 1}></span>
				</div>
				<div class="footer-slot footer-right">
					{#if mobileStep === 0}
						<button class="nav-btn" transition:fade={{ duration: 200 }} onclick={() => (mobileStep = 1)}>
							flower
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if smellToast}
		<div class="smell-toast" transition:fly={{ y: 20, duration: 300 }}>
			{smellToast}
		</div>
	{/if}

	{#if lightboxOpen && entry?.images}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="lightbox" transition:fade={{ duration: 200 }} onclick={() => (lightboxOpen = false)}>
			<img src="/api/images/{entry.images[lightboxIndex]}" alt="" class="lightbox-img" onclick={(e) => e.stopPropagation()} />
			<span class="lightbox-counter">{lightboxIndex + 1} / {entry.images.length}</span>
			<button class="lightbox-close" onclick={() => (lightboxOpen = false)}>&times;</button>
			{#if entry.images.length > 1}
				<button class="lightbox-arrow lightbox-prev" onclick={(e) => { e.stopPropagation(); lightboxIndex = (lightboxIndex - 1 + entry.images!.length) % entry.images!.length; }}>&lsaquo;</button>
				<button class="lightbox-arrow lightbox-next" onclick={(e) => { e.stopPropagation(); lightboxIndex = (lightboxIndex + 1) % entry.images!.length; }}>&rsaquo;</button>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--ui-overlay);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.reveal-card {
		position: relative;
		background: var(--ui-card);
		border: 1px solid var(--ui-card-border);
		border-radius: 20px;
		padding: 16px 24px 28px;
		max-width: 900px;
		width: 94%;
		box-shadow: var(--ui-shadow);
		color: var(--ui-text);
	}

	.top-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--ui-divider);
		min-width: 0;
		overflow: hidden;
	}

	.top-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 1;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.top-meta::-webkit-scrollbar {
		display: none;
	}

	.top-date {
		font-size: 15px;
		color: var(--ui-text-soft, var(--ui-text-muted));
		letter-spacing: 0.3px;
		margin-right: auto;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.meta-tag {
		font-size: 12px;
		padding: 3px 9px;
		border-radius: 6px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		letter-spacing: 0.3px;
		white-space: nowrap;
	}

	.time-tag {
		cursor: help;
	}

	.weather-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.weather-tag :global(svg) {
		vertical-align: middle;
		opacity: 0.8;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		cursor: inherit;
		color: var(--ui-text-muted);
		transition: color 0.2s;
		line-height: 1;
		padding: 2px 4px;
		flex-shrink: 0;
	}
	.close-btn:hover {
		color: var(--ui-text);
	}

	.card-body {
		min-height: 0;
	}

	.panels {
		display: flex;
		gap: 36px;
		align-items: flex-start;
	}

	.card-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
		padding-top: 12px;
		margin-top: 8px;
		border-top: 1px solid var(--ui-divider);
	}

	.mobile-footer {
		display: none;
	}

	@media (max-width: 600px) {
		.overlay {
			padding: 12px;
		}
		.reveal-card {
			padding: 12px 14px 16px;
			width: 100%;
			max-width: 100%;
			height: calc(100dvh - 24px);
			max-height: calc(100dvh - 24px);
			overflow: hidden;
			border-radius: 14px;
			display: flex;
			flex-direction: column;
		}
		.card-body {
			flex: 1;
			min-height: 0;
			overflow: hidden;
		}
		.panels {
			gap: 0;
			min-height: 0;
			height: 100%;
			transform: translateX(calc(var(--step) * -100%));
			transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
		}
		.panel {
			width: 100%;
			min-width: 100%;
			max-width: 100%;
			flex-shrink: 0;
			overflow-y: auto;
			overflow-x: hidden;
			scrollbar-width: none;
			box-sizing: border-box;
			padding: 0 2px;
		}
		.panel::-webkit-scrollbar {
			display: none;
		}
		.panel-flower-view {
			width: 100% !important;
			min-width: 100% !important;
			flex: none !important;
			height: 100%;
			align-items: center;
			order: 1;
			overflow-y: auto !important;
			scrollbar-width: none;
		}
		.panel-flower-view::-webkit-scrollbar {
			display: none;
		}
		.panel-text-view {
			width: 100% !important;
			min-width: 100% !important;
			flex: none !important;
			height: 100% !important;
			order: 0;
			display: block !important;
			overflow-y: auto !important;
			scrollbar-width: none;
		}
		.text-inner {
			min-height: 100%;
			display: flex;
			flex-direction: column;
		}
		.bottom-row {
			margin-top: auto;
		}
		.btn-label {
			display: none;
		}
		.panel-text-view::-webkit-scrollbar {
			display: none;
		}
		.flower-canvas {
			max-height: 180px;
			width: auto;
		}
		.flower-name {
			font-size: 16px;
			margin-bottom: 8px;
		}
		.mood-bars {
			width: 100%;
			align-self: stretch;
			padding: 0 4px;
			box-sizing: border-box;
		}
		.mood-track {
			min-width: 0;
		}
		.mood-label {
			width: 50px;
			font-size: 9px;
		}
		.entry-title {
			font-size: 20px;
		}
		.top-bar {
			gap: 6px;
			margin-bottom: 12px;
			padding-bottom: 10px;
			flex-shrink: 0;
		}
		.top-date {
			font-size: 13px;
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.top-meta {
			display: none;
		}
		.mobile-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			flex-shrink: 0;
		}
		.footer-slot {
			flex: 1;
			min-width: 0;
		}
		.footer-left {
			display: flex;
			justify-content: flex-start;
		}
		.footer-right {
			display: flex;
			justify-content: flex-end;
		}
		.footer-actions {
			display: flex;
			gap: 6px;
		}
	}

	.panel-flower-view {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		width: 260px;
		min-height: 0;
	}

	.flower-display {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		margin-bottom: 8px;
		border-radius: 12px;
		overflow: hidden;
		background: var(--ui-flower-bg, rgba(30, 25, 18, 0.45));
		padding: 12px;
	}

	.flower-glow {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 60px;
		height: 60px;
		border-radius: 50%;
		filter: blur(18px);
		pointer-events: none;
	}

	.flower-canvas {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		position: relative;
		z-index: 1;
	}

	.flower-name {
		font-size: 20px;
		font-weight: 300;
		letter-spacing: 1px;
		text-align: center;
		color: var(--ui-text);
		margin-bottom: 2px;
	}

	.flower-age {
		font-size: 12px;
		text-align: center;
		color: var(--ui-text-muted);
		letter-spacing: 0.5px;
		margin-bottom: 14px;
	}

	.smell-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 9px;
		border-radius: 6px;
		border: none;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		font-family: inherit;
		font-size: 12px;
		line-height: 1;
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s, color 0.2s, transform 0.15s;
		white-space: nowrap;
		letter-spacing: 0.3px;
		flex-shrink: 0;
	}
	.smell-btn :global(svg) {
		display: block;
	}
	.smell-btn:hover:not(:disabled) {
		background: var(--ui-divider);
		color: var(--ui-text);
	}
	.smell-btn:active:not(:disabled) {
		transform: scale(0.95);
	}
	.smell-btn.smelled {
		color: var(--ui-text-soft);
		cursor: default;
	}
	.smell-btn:disabled:not(.smelled) {
		opacity: 0.5;
		cursor: default;
	}

	.smell-count {
		font-variant-numeric: tabular-nums;
	}

	.star-btn {
		display: inline-flex;
		align-items: center;
		padding: 3px 7px;
		border-radius: 6px;
		border: none;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s, color 0.2s, transform 0.15s;
		flex-shrink: 0;
		line-height: 1;
	}
	.star-btn:hover:not(:disabled) {
		background: var(--ui-divider);
		color: rgb(200, 160, 30);
	}
	.star-btn:active:not(:disabled) {
		transform: scale(0.95);
	}
	.star-btn.starred {
		color: rgb(200, 160, 30);
	}
	.star-btn:disabled:not(.starred) {
		opacity: 0.5;
		cursor: default;
	}

	.step-dots {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.12));
		transition: width 0.3s, background 0.3s;
	}
	.dot.active {
		width: 18px;
		background: var(--ui-text-muted);
	}

	.nav-btn {
		font-family: inherit;
		font-size: 13px;
		padding: 8px 16px;
		border: none;
		border-radius: 10px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s;
		letter-spacing: 0.5px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.nav-btn:hover {
		background: var(--ui-divider);
	}

	.share-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: 6px;
		border: none;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		font-family: inherit;
		font-size: 11px;
		letter-spacing: 0.3px;
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s, color 0.2s;
	}
	.share-btn:hover {
		background: var(--ui-divider);
		color: var(--ui-text);
	}

	.smell-toast {
		position: fixed;
		bottom: 32px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 150;
		padding: 14px 28px;
		border-radius: 14px;
		background: var(--ui-card, rgba(20, 20, 30, 0.95));
		border: 1px solid var(--ui-card-border, rgba(255,255,255,0.1));
		color: var(--ui-text-soft, rgba(255,255,255,0.8));
		font-family: 'Darumadrop One', cursive;
		font-size: 18px;
		letter-spacing: 0.5px;
		white-space: nowrap;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: var(--ui-shadow);
		pointer-events: none;
		max-width: calc(100vw - 32px);
		box-sizing: border-box;
	}

	@media (max-width: 600px) {
		.smell-toast {
			white-space: normal;
			text-align: center;
			font-size: 15px;
			padding: 12px 20px;
			bottom: 80px;
		}
	}

	.mood-bars {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mood-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mood-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1.2px;
		color: var(--ui-text-muted);
		width: 80px;
		text-align: right;
		flex-shrink: 0;
	}

	.mood-track {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--ui-bar-bg);
		overflow: hidden;
		min-width: 120px;
	}

	.mood-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.6s ease;
	}

	.panel-text-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		min-height: 420px;
	}
	.panel-text-view::-webkit-scrollbar {
		display: none;
	}

	.text-inner {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.bottom-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid var(--ui-divider);
		flex-shrink: 0;
	}

	.action-btns {
		display: flex;
		gap: 6px;
		margin-left: auto;
	}

	.entry-title {
		font-size: 26px;
		font-weight: 400;
		letter-spacing: 0.5px;
		color: var(--ui-text);
		margin: 0 0 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--ui-divider);
		flex-shrink: 0;
	}

	.journal-text {
		font-family: inherit;
		font-size: 16px;
		line-height: 1.65;
		color: var(--ui-text-soft);
		flex: 1;
		overflow-y: auto;
		overflow-wrap: break-word;
		padding: 4px 0 16px;
		scrollbar-width: none;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 0%,
			black 12px,
			black calc(100% - 24px),
			transparent 100%
		);
		mask-image: linear-gradient(
			to bottom,
			transparent 0%,
			black 12px,
			black calc(100% - 24px),
			transparent 100%
		);
	}
	.journal-text::-webkit-scrollbar {
		display: none;
	}

	.journal-text :global(p) {
		margin: 0 0 0.7em;
	}
	.journal-text :global(p:last-child) {
		margin-bottom: 0;
	}
	.journal-text :global(h1), .journal-text :global(h2), .journal-text :global(h3) {
		color: var(--ui-text);
		margin: 1em 0 0.4em;
		font-weight: 500;
	}
	.journal-text :global(h1) { font-size: 1.3em; }
	.journal-text :global(h2) { font-size: 1.15em; }
	.journal-text :global(h3) { font-size: 1.05em; }
	.journal-text :global(strong) {
		font-weight: 600;
		color: var(--ui-text);
	}
	.journal-text :global(em) {
		font-style: italic;
	}
	.journal-text :global(a) {
		color: var(--link-color, var(--ui-accent, #5a9e60));
		text-decoration: underline;
		cursor: var(--cursor-pointer, pointer);
	}
	.journal-text :global(blockquote) {
		margin: 0.5em 0;
		padding-left: 12px;
		border-left: 2px solid var(--ui-divider);
		color: var(--ui-text-muted);
	}
	.journal-text :global(code) {
		font-size: 0.9em;
		padding: 1px 4px;
		border-radius: 3px;
		background: var(--ui-bar-bg, rgba(0,0,0,0.06));
	}
	.journal-text :global(ul), .journal-text :global(ol) {
		margin: 0.4em 0;
		padding-left: 1.5em;
	}
	.journal-text :global(hr) {
		border: none;
		border-top: 1px solid var(--ui-divider);
		margin: 1em 0;
	}


	.image-strip {
		display: flex;
		gap: 8px;
		margin-bottom: 8px;
		flex-shrink: 0;
		align-items: center;
	}

	.img-wrap {
		height: 80px;
		border-radius: 8px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		overflow: hidden;
		position: relative;
	}
	.img-wrap::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
		animation: shimmer 1.5s ease infinite;
		pointer-events: none;
	}
	@keyframes shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}
	.img-wrap:only-of-type {
		height: 180px;
	}
	.img-wrap.img-loaded {
		background: none;
	}
	.img-wrap.img-loaded::after {
		display: none;
	}

	.strip-img {
		height: 100%;
		width: auto;
		border-radius: 8px;
		object-fit: cover;
		cursor: var(--cursor-pointer, pointer);
		display: block;
		position: relative;
		z-index: 1;
	}
	.strip-img:hover {
		opacity: 0.8;
	}

	.more-images {
		font-family: inherit;
		font-size: 12px;
		padding: 6px 14px;
		border: 1px solid var(--ui-divider);
		border-radius: 8px;
		background: var(--ui-bar-bg, rgba(0,0,0,0.04));
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		white-space: nowrap;
		transition: background 0.2s;
	}
	.more-images:hover {
		background: var(--ui-divider);
	}

	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox-img {
		max-width: 90vw;
		max-height: 85vh;
		object-fit: contain;
		border-radius: 4px;
	}

	.lightbox-close {
		position: absolute;
		top: 16px;
		right: 20px;
		font-size: 32px;
		color: rgba(255, 255, 255, 0.7);
		background: none;
		border: none;
		cursor: pointer;
		line-height: 1;
	}
	.lightbox-close:hover { color: #fff; }

	.lightbox-counter {
		position: absolute;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 13px;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 1px;
	}

	.lightbox-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		font-size: 48px;
		color: rgba(255, 255, 255, 0.5);
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px 16px;
		transition: color 0.2s;
	}
	.lightbox-arrow:hover { color: #fff; }
	.lightbox-prev { left: 12px; }
	.lightbox-next { right: 12px; }

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tag {
		font-size: 12px;
		padding: 4px 14px;
		border-radius: 20px;
		background: var(--ui-tag);
		color: var(--ui-tag-text);
		letter-spacing: 0.3px;
	}

	.song-section {
		margin-top: 14px;
		max-width: 100%;
		overflow: hidden;
	}

	.song-heading {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1.2px;
		color: var(--ui-text-muted);
		margin-bottom: 6px;
		display: block;
	}

	.song-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 10px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		max-width: 100%;
		box-sizing: border-box;
	}

	.song-art {
		width: 40px;
		height: 40px;
		border-radius: 6px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.song-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.song-title {
		font-size: 12px;
		color: var(--ui-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.song-artist {
		font-size: 10px;
		color: var(--ui-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.song-link {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		color: var(--ui-text-muted);
		transition: color 0.2s;
		text-decoration: none;
	}
	.song-link:hover {
		color: var(--ui-text);
	}

	.song-play-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: var(--ui-divider);
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.2s, color 0.2s, transform 0.15s;
	}
	.song-play-btn:hover {
		background: var(--ui-text-muted);
		color: var(--ui-card);
	}
	.song-play-btn:active {
		transform: scale(0.92);
	}
	.song-play-btn.playing {
		color: var(--ui-text);
	}

</style>
