.PHONY: setup dev build start docker clean

setup:
	npm install
	node setup.mjs

dev:
	npm run dev

build:
	npm run build

start: build
	node build

docker:
	docker compose up --build -d

docker-down:
	docker compose down

clean:
	rm -rf build .svelte-kit node_modules
