import { hashSync, compareSync } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';
import db from './db.js';

function getPasswordHash(): string {
	return env.HIKARI_ADMIN_PASSWORD_HASH ?? '';
}

export function verifyPassword(password: string): boolean {
	const hash = getPasswordHash();
if (!hash) return false;
	return compareSync(password, hash);
}

export function hashPassword(password: string): string {
	return hashSync(password, 12);
}

export function createSession(): string {
	const token = randomBytes(32).toString('hex');
	const now = Date.now();
	const expires = now + 7 * 24 * 60 * 60 * 1000; // 7 days

	db.prepare('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)').run(
		token,
		now,
		expires
	);

	// Clean up expired sessions
	db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);

	return token;
}

export function validateSession(token: string): boolean {
	const row = db
		.prepare('SELECT expires_at FROM sessions WHERE token = ?')
		.get(token) as { expires_at: number } | undefined;

	if (!row) return false;
	if (row.expires_at < Date.now()) {
		db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
		return false;
	}
	return true;
}

export function destroySession(token: string): void {
	db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
