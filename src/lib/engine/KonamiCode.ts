const SEQUENCE = [
	'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
	'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
	'b', 'a'
];

export class KonamiCode {
	private buffer: string[] = [];
	private callback: () => void;
	private handler: (e: KeyboardEvent) => void;

	constructor(callback: () => void) {
		this.callback = callback;
		this.handler = (e: KeyboardEvent) => {
			this.buffer.push(e.key);
			if (this.buffer.length > SEQUENCE.length) {
				this.buffer.shift();
			}
			if (this.buffer.length === SEQUENCE.length &&
				this.buffer.every((k, i) => k === SEQUENCE[i])) {
				this.buffer = [];
				this.callback();
			}
		};
		window.addEventListener('keydown', this.handler);
	}

	destroy() {
		window.removeEventListener('keydown', this.handler);
	}
}
