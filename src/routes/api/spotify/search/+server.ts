import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { env } from '$env/dynamic/private';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
		return cachedToken.token;
	}

	const clientId = env.SPOTIFY_CLIENT_ID;
	const clientSecret = env.SPOTIFY_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('Spotify credentials not configured');
	}

	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: 'grant_type=client_credentials'
	});

	if (!res.ok) {
		throw new Error('Failed to get Spotify access token');
	}

	const data = await res.json();
	cachedToken = {
		token: data.access_token,
		expiresAt: Date.now() + data.expires_in * 1000
	};
	return cachedToken.token;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q');
	if (!query || query.trim().length < 2) {
		return json({ tracks: [] });
	}

	try {
		const token = await getAccessToken();
		const searchRes = await fetch(
			`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=6`,
			{ headers: { Authorization: `Bearer ${token}` } }
		);

		if (!searchRes.ok) {
			return json({ error: 'Spotify search failed' }, { status: 502 });
		}

		const data = await searchRes.json();
		const tracks = (data.tracks?.items || []).map((t: any) => ({
			trackId: t.id,
			title: t.name,
			artist: t.artists.map((a: any) => a.name).join(', '),
			albumArt: t.album.images?.[1]?.url || t.album.images?.[0]?.url || '',
			spotifyUrl: t.external_urls?.spotify || ''
		}));

		return json({ tracks });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
};
