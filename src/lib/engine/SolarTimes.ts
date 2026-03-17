/**
 * Compute sunrise and sunset times for a given date and location.
 * Uses the simplified NOAA solar equations.
 * Returns hours in local time (fractional, e.g. 6.5 = 6:30 AM).
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface SolarResult {
	sunrise: number; // fractional hour in local time
	sunset: number;
	dawnStart: number; // civil twilight start (sunrise - ~30min)
	duskEnd: number;   // civil twilight end (sunset + ~30min)
}

export function computeSolarTimes(lat: number, lng: number, date: Date = new Date()): SolarResult {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();

	// Day of year
	const n1 = Math.floor(275 * month / 9);
	const n2 = Math.floor((month + 9) / 12);
	const n3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
	const dayOfYear = n1 - n2 * n3 + day - 30;

	// Solar noon approximation
	const lngHour = lng / 15;

	// Sunrise
	const tRise = dayOfYear + (6 - lngHour) / 24;
	const tSet = dayOfYear + (18 - lngHour) / 24;

	// Sun's mean anomaly
	const mRise = 0.9856 * tRise - 3.289;
	const mSet = 0.9856 * tSet - 3.289;

	// Sun's true longitude
	let lRise = mRise + 1.916 * Math.sin(mRise * DEG) + 0.020 * Math.sin(2 * mRise * DEG) + 282.634;
	let lSet = mSet + 1.916 * Math.sin(mSet * DEG) + 0.020 * Math.sin(2 * mSet * DEG) + 282.634;
	lRise = ((lRise % 360) + 360) % 360;
	lSet = ((lSet % 360) + 360) % 360;

	// Right ascension
	let raRise = Math.atan(0.91764 * Math.tan(lRise * DEG)) * RAD;
	let raSet = Math.atan(0.91764 * Math.tan(lSet * DEG)) * RAD;
	raRise = ((raRise % 360) + 360) % 360;
	raSet = ((raSet % 360) + 360) % 360;

	// Adjust RA to same quadrant as L
	raRise += Math.floor(lRise / 90) * 90 - Math.floor(raRise / 90) * 90;
	raSet += Math.floor(lSet / 90) * 90 - Math.floor(raSet / 90) * 90;

	// Convert to hours
	raRise /= 15;
	raSet /= 15;

	// Sun's declination
	const sinDecRise = 0.39782 * Math.sin(lRise * DEG);
	const cosDecRise = Math.cos(Math.asin(sinDecRise));
	const sinDecSet = 0.39782 * Math.sin(lSet * DEG);
	const cosDecSet = Math.cos(Math.asin(sinDecSet));

	// Hour angle (sun center at horizon = -0.8333 degrees for atmospheric refraction)
	const zenith = 90.8333;
	const cosHRise = (Math.cos(zenith * DEG) - sinDecRise * Math.sin(lat * DEG)) / (cosDecRise * Math.cos(lat * DEG));
	const cosHSet = (Math.cos(zenith * DEG) - sinDecSet * Math.sin(lat * DEG)) / (cosDecSet * Math.cos(lat * DEG));

	// Check for polar day/night
	if (cosHRise > 1 || cosHSet > 1) {
		// Sun never rises — polar night, return defaults
		return { sunrise: 8, sunset: 16, dawnStart: 7, duskEnd: 17 };
	}
	if (cosHRise < -1 || cosHSet < -1) {
		// Sun never sets — polar day
		return { sunrise: 3, sunset: 23, dawnStart: 2, duskEnd: 24 };
	}

	const hRise = (360 - Math.acos(cosHRise) * RAD) / 15;
	const hSet = Math.acos(cosHSet) * RAD / 15;

	// Convert local mean time → UTC → local timezone
	const tzOffset = -date.getTimezoneOffset() / 60;

	// Step 8: local mean time of rising/setting
	const sunriseLMT = hRise + raRise - 0.06571 * tRise - 6.622;
	const sunsetLMT = hSet + raSet - 0.06571 * tSet - 6.622;

	// Step 9: LMT → UTC (subtract longitude hour offset)
	// Step 10: UTC → local timezone
	let sunrise = ((sunriseLMT - lngHour + tzOffset) % 24 + 24) % 24;
	let sunset = ((sunsetLMT - lngHour + tzOffset) % 24 + 24) % 24;

	// Civil twilight (~6 degrees below horizon → roughly 30 min before/after)
	const dawnStart = sunrise - 0.5;
	const duskEnd = sunset + 0.5;

	return { sunrise, sunset, dawnStart, duskEnd };
}

/** Default fallback: month-adjusted times for temperate latitudes (~45°N).
 *  Must match the approximation in app.html inline script. */
export function getDefaultSolarTimes(): SolarResult {
	const srAdj = [1, 0.5, 0, -0.5, -1, -1, -0.5, 0, 0.5, 1, 1, 1];
	const month = new Date().getMonth();
	const sunrise = 6.5 + (srAdj[month] || 0);
	const sunset = 19.5 - (srAdj[month] || 0);
	return { sunrise, sunset, dawnStart: sunrise - 0.5, duskEnd: sunset + 0.5 };
}

// ─── Singleton state ───

let cachedTimes: SolarResult | null = null;
let cacheDate = '';
let geoRequested = false;

/** Get current solar times. Returns cached value, localStorage cache, or defaults. */
export function getSolarTimes(): SolarResult {
	const today = new Date().toDateString();
	if (cachedTimes && cacheDate === today) return cachedTimes;

	// Try localStorage cache from previous session (v2 = fixed NOAA formula)
	if (!cachedTimes && typeof localStorage !== 'undefined') {
		try {
			const stored = localStorage.getItem('hikari-solar');
			if (stored) {
				const parsed = JSON.parse(stored);
				if (parsed.v === 2 && parsed.date === today && parsed.sunrise && parsed.sunset) {
					cachedTimes = {
						sunrise: parsed.sunrise,
						sunset: parsed.sunset,
						dawnStart: parsed.sunrise - 0.5,
						duskEnd: parsed.sunset + 0.5
					};
					cacheDate = today;
					return cachedTimes;
				}
			}
		} catch { /* ignore */ }
	}

	if (!cachedTimes) cachedTimes = getDefaultSolarTimes();
	return cachedTimes;
}

/** Fetch IP-based location and compute real solar times. Call once on app init.
 *  Uses ipapi.co (same as weather) — no browser permission prompt. */
export function initSolarTimes(onUpdate?: () => void) {
	if (geoRequested) return;
	geoRequested = true;

	if (typeof fetch === 'undefined') return;

	fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
		.then((r) => r.ok ? r.json() : null)
		.then((data) => {
			if (!data?.latitude || !data?.longitude) return;
			cachedTimes = computeSolarTimes(data.latitude, data.longitude);
			cacheDate = new Date().toDateString();
			// Cache for instant use on next page load (avoids theme flash)
			try {
				localStorage.setItem('hikari-solar', JSON.stringify({
					v: 2,
					date: cacheDate,
					sunrise: cachedTimes.sunrise,
					sunset: cachedTimes.sunset
				}));
			} catch { /* localStorage full or unavailable */ }
			console.log('[solar] IP-based: sunrise=' + cachedTimes.sunrise.toFixed(2) + ' sunset=' + cachedTimes.sunset.toFixed(2) + ' lat=' + data.latitude + ' lng=' + data.longitude);
			onUpdate?.();
		})
		.catch(() => { /* stick with defaults */ });
}
