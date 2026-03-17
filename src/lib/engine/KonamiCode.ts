const SEQUENCE = [
	'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
	'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
	'b', 'a'
];

const STARS_SEQUENCE = ['s', 't', 'a', 'r', 's'];

export class KonamiCode {
	private buffer: string[] = [];
	private callback: () => void;
	private starsCallback: (() => void) | null = null;
	private handler: (e: KeyboardEvent) => void;

	constructor(callback: () => void) {
		this.callback = callback;
		this.handler = (e: KeyboardEvent) => {
			this.buffer.push(e.key);
			if (this.buffer.length > SEQUENCE.length) {
				this.buffer.shift();
			}

			// Check konami code
			if (this.buffer.length === SEQUENCE.length &&
				this.buffer.every((k, i) => k === SEQUENCE[i])) {
				this.buffer = [];
				this.callback();
				return;
			}

			// Check "stars" code (last 5 characters)
			if (this.starsCallback && this.buffer.length >= STARS_SEQUENCE.length) {
				const tail = this.buffer.slice(-STARS_SEQUENCE.length);
				if (tail.every((k, i) => k === STARS_SEQUENCE[i])) {
					this.buffer = [];
					this.starsCallback();
				}
			}
		};
		window.addEventListener('keydown', this.handler);
	}

	onStars(callback: () => void) {
		this.starsCallback = callback;
	}

	destroy() {
		window.removeEventListener('keydown', this.handler);
	}
}
