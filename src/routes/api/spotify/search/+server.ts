import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getSpotifyToken } from '$lib/server/spotify.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q');
	if (!query || query.trim().length < 2) {
		return json({ tracks: [] });
	}

	try {
		const token = await getSpotifyToken();
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
			spotifyUrl: t.external_urls?.spotify || '',
			...(t.preview_url ? { previewUrl: t.preview_url } : {})
		}));

		return json({ tracks });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
};
