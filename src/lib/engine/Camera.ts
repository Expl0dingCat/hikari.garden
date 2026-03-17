export class Camera {
	x = 0;
	y = 0;
	zoom = 1;
	targetX = 0;
	targetY = 0;
	targetZoom = 1;

	private isDragging = false;
	private didDrag = false;
	userInteracted = false;
	private lastPointerX = 0;
	private lastPointerY = 0;
	private smoothing = 0.12;
	private dragThreshold = 5; // pixels before considered a drag

	// Pinch-to-zoom state
	private activePointers = new Map<number, { x: number; y: number }>();
	private lastPinchDist = 0;
	private isPinching = false;

	minZoom = 0.3;
	maxZoom = 3;

	private getCursor: ((type: 'default' | 'grabbing') => string) | null = null;

	constructor(
		private canvas: HTMLCanvasElement,
		private onUpdate: () => void
	) {
		this.bindEvents();
	}

	setCursorProvider(fn: (type: 'default' | 'grabbing') => string) {
		this.getCursor = fn;
	}

	// Track whether the last interaction was a drag (used by GardenEngine)
	wasDrag(): boolean {
		return this.didDrag;
	}

	private bindEvents() {
		this.canvas.addEventListener('pointerdown', this.onPointerDown);
		this.canvas.addEventListener('pointermove', this.onPointerMove);
		this.canvas.addEventListener('pointerup', this.onPointerUp);
		this.canvas.addEventListener('pointerleave', this.onPointerUp);
		this.canvas.addEventListener('pointercancel', this.onPointerUp);
		this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
		this.canvas.style.touchAction = 'none';
	}

	private onPointerDown = (e: PointerEvent) => {
		this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (this.activePointers.size === 2) {
			// Start pinch
			this.isPinching = true;
			this.isDragging = false;
			this.lastPinchDist = this.getPinchDist();
			return;
		}

		this.isDragging = true;
		this.didDrag = false;
		this.lastPointerX = e.clientX;
		this.lastPointerY = e.clientY;
	};

	private onPointerMove = (e: PointerEvent) => {
		this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (this.isPinching && this.activePointers.size === 2) {
			const dist = this.getPinchDist();
			if (this.lastPinchDist > 0) {
				const scale = dist / this.lastPinchDist;
				this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * scale));
				this.userInteracted = true;
			}
			this.lastPinchDist = dist;
			return;
		}

		if (!this.isDragging) return;
		const dx = e.clientX - this.lastPointerX;
		const dy = e.clientY - this.lastPointerY;

		if (!this.didDrag && Math.abs(dx) + Math.abs(dy) > this.dragThreshold) {
			this.didDrag = true;
			this.canvas.style.cursor = this.getCursor?.('grabbing') ?? 'grabbing';
		}

		if (this.didDrag) {
			this.targetX += dx / this.zoom;
			this.targetY += dy / this.zoom;
			this.userInteracted = true;
		}

		this.lastPointerX = e.clientX;
		this.lastPointerY = e.clientY;
	};

	private onPointerUp = (e: PointerEvent) => {
		this.activePointers.delete(e.pointerId);

		if (this.activePointers.size < 2) {
			this.isPinching = false;
			this.lastPinchDist = 0;
		}

		if (this.activePointers.size === 0) {
			this.isDragging = false;
			this.canvas.style.cursor = this.getCursor?.('default') ?? 'grab';
		}
	};

	private getPinchDist(): number {
		const pts = [...this.activePointers.values()];
		if (pts.length < 2) return 0;
		const dx = pts[0].x - pts[1].x;
		const dy = pts[0].y - pts[1].y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	private onWheel = (e: WheelEvent) => {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
		this.userInteracted = true;
	};

	focusOn(x: number, y: number, zoom?: number) {
		this.targetX = -x;
		this.targetY = -y;
		if (zoom !== undefined) this.targetZoom = zoom;
	}

	update() {
		const prevX = this.x;
		const prevY = this.y;
		const prevZoom = this.zoom;

		this.x += (this.targetX - this.x) * this.smoothing;
		this.y += (this.targetY - this.y) * this.smoothing;
		this.zoom += (this.targetZoom - this.zoom) * this.smoothing;

		if (
			Math.abs(this.x - prevX) > 0.01 ||
			Math.abs(this.y - prevY) > 0.01 ||
			Math.abs(this.zoom - prevZoom) > 0.001
		) {
			this.onUpdate();
		}
	}

	screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();
		const cx = rect.width / 2;
		const cy = rect.height / 2;
		return {
			x: (screenX - cx) / this.zoom - this.x,
			y: (screenY - cy) / this.zoom - this.y
		};
	}

	destroy() {
		this.canvas.removeEventListener('pointerdown', this.onPointerDown);
		this.canvas.removeEventListener('pointermove', this.onPointerMove);
		this.canvas.removeEventListener('pointerup', this.onPointerUp);
		this.canvas.removeEventListener('pointerleave', this.onPointerUp);
		this.canvas.removeEventListener('pointercancel', this.onPointerUp);
		this.canvas.removeEventListener('wheel', this.onWheel);
	}
}
