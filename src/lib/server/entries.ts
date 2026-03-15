import db from './db.js';
import type { JournalEntry, MoodVector } from '$lib/types.js';

interface EntryRow {
	id: string;
	date: string;
	created_at: number;
	updated_at: number;
	title: string;
	text: string;
	mood_joy: number;
	mood_energy: number;
	mood_tenderness: number;
	mood_clarity: number;
	mood_hope: number;
	flower_seed: number;
	flower_name: string;
	tags: string | null;
	weather: string | null;
	images: string | null;
}

function rowToEntry(row: EntryRow): JournalEntry {
	return {
		id: row.id,
		date: row.date,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		title: row.title,
		text: row.text,
		mood: {
			joy: row.mood_joy,
			energy: row.mood_energy,
			tenderness: row.mood_tenderness,
			clarity: row.mood_clarity,
			hope: row.mood_hope
		},
		flowerSeed: row.flower_seed,
		flowerName: row.flower_name,
		tags: row.tags ? JSON.parse(row.tags) : undefined,
		weather: row.weather ? JSON.parse(row.weather) : undefined,
		images: row.images ? JSON.parse(row.images) : undefined
	};
}

const stmts = {
	getAll: db.prepare('SELECT * FROM entries ORDER BY date ASC'),
	getById: db.prepare('SELECT * FROM entries WHERE id = ?'),
	getByDate: db.prepare('SELECT * FROM entries WHERE date = ?'),
	insert: db.prepare(`
		INSERT INTO entries (id, date, created_at, updated_at, title, text,
			mood_joy, mood_energy, mood_tenderness, mood_clarity, mood_hope,
			flower_seed, flower_name, tags, weather, images)
		VALUES (@id, @date, @created_at, @updated_at, @title, @text,
			@mood_joy, @mood_energy, @mood_tenderness, @mood_clarity, @mood_hope,
			@flower_seed, @flower_name, @tags, @weather, @images)
	`),
	update: db.prepare(`
		UPDATE entries SET
			date = @date, updated_at = @updated_at, title = @title, text = @text,
			mood_joy = @mood_joy, mood_energy = @mood_energy,
			mood_tenderness = @mood_tenderness, mood_clarity = @mood_clarity,
			mood_hope = @mood_hope, flower_seed = @flower_seed,
			flower_name = @flower_name, tags = @tags, weather = @weather, images = @images
		WHERE id = @id
	`),
	delete: db.prepare('DELETE FROM entries WHERE id = ?')
};

export function getAllEntries(): JournalEntry[] {
	return (stmts.getAll.all() as EntryRow[]).map(rowToEntry);
}

export function getEntryById(id: string): JournalEntry | undefined {
	const row = stmts.getById.get(id) as EntryRow | undefined;
	return row ? rowToEntry(row) : undefined;
}

export function getEntryByDate(date: string): JournalEntry | undefined {
	const row = stmts.getByDate.get(date) as EntryRow | undefined;
	return row ? rowToEntry(row) : undefined;
}

function entryToParams(entry: JournalEntry) {
	return {
		id: entry.id,
		date: entry.date,
		created_at: entry.createdAt,
		updated_at: entry.updatedAt,
		title: entry.title,
		text: entry.text,
		mood_joy: entry.mood.joy,
		mood_energy: entry.mood.energy,
		mood_tenderness: entry.mood.tenderness,
		mood_clarity: entry.mood.clarity,
		mood_hope: entry.mood.hope,
		flower_seed: entry.flowerSeed,
		flower_name: entry.flowerName,
		tags: entry.tags ? JSON.stringify(entry.tags) : null,
		weather: entry.weather ? JSON.stringify(entry.weather) : null,
		images: entry.images ? JSON.stringify(entry.images) : null
	};
}

export function createEntry(entry: JournalEntry): JournalEntry {
	stmts.insert.run(entryToParams(entry));
	return entry;
}

export function updateEntry(entry: JournalEntry): JournalEntry {
	stmts.update.run(entryToParams(entry));
	return entry;
}

export function deleteEntry(id: string): boolean {
	const result = stmts.delete.run(id);
	return result.changes > 0;
}
