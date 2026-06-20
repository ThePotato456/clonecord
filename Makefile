SHELL := /bin/bash

ROOT_DIR := $(CURDIR)
FRONTEND_DIR := $(ROOT_DIR)/frontend
BACKEND_ENTRY := $(ROOT_DIR)/src/backend/server.js
DATA_FILE := $(ROOT_DIR)/src/backend/data/db.json
NODE := node
NPM := npm

.PHONY: help install backend frontend run build health clean reset-data

help:
	@echo "Available targets:"
	@echo "  make install     - Install root and frontend dependencies"
	@echo "  make backend     - Start the backend server"
	@echo "  make frontend    - Start the frontend dev server"
	@echo "  make run         - Start backend and frontend together"
	@echo "  make build       - Build the frontend production bundle"
	@echo "  make health      - Check backend health endpoint"
	@echo "  make clean       - Remove frontend build output"
	@echo "  make reset-data  - Reset local backend data store"

install:
	$(NPM) install
	cd $(FRONTEND_DIR) && $(NPM) install

backend:
	$(NODE) $(BACKEND_ENTRY)

frontend:
	cd $(FRONTEND_DIR) && $(NPM) start

run:
	$(NPM) start

build:
	cd $(FRONTEND_DIR) && $(NPM) run build

health:
	@curl -fsS http://localhost:4000/health || (echo "Backend is not responding on port 4000" && exit 1)
	@echo

clean:
	rm -rf $(FRONTEND_DIR)/build

reset-data:
	rm -f $(DATA_FILE)
	@echo "Removed $(DATA_FILE). It will be recreated on next backend start."
