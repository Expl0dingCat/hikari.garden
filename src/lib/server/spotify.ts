import { env } from '$env/dynamic/private';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getSpotifyToken(): Promise<string> {
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
