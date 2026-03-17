import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getSpotifyToken } from '$lib/server/spotify.js';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	if (!id || !/^[a-zA-Z0-9]{22}$/.test(id)) {
		return json({ previewUrl: null });
	}

	try {
		const token = await getSpotifyToken();
		const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (!res.ok) {
			return json({ previewUrl: null });
		}

		const track = await res.json();
		return json({ previewUrl: track.preview_url || null });
	} catch {
		return json({ previewUrl: null });
	}
};
