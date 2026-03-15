import type { RequestHandler } from './$types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const IMAGE_DIR = resolve('data/images');

const MIME_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif'
};

export const GET: RequestHandler = async ({ params }) => {
	const { filename } = params;

	// Prevent path traversal
	if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		return new Response('Not found', { status: 404 });
	}

	const filepath = resolve(IMAGE_DIR, filename);
	if (!existsSync(filepath)) {
		return new Response('Not found', { status: 404 });
	}

	const ext = filename.split('.').pop()?.toLowerCase() || '';
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	const buffer = readFileSync(filepath);

	return new Response(buffer, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};
