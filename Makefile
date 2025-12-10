.PHONY: help install build clean watch package test

# Default target
help:
	@echo "Available targets:"
	@echo "  make install    - Install all dependencies"
	@echo "  make build      - Build extension"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make watch      - Watch mode for development"
	@echo "  make package    - Package extension as .vsix"
	@echo "  make test       - Run tests"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install
	@echo "Dependencies installed successfully!"

# Build everything
build:
	@echo "Building extension..."
	npm run compile
	@echo "Build completed successfully!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf out/
	rm -rf bin/
	rm -rf node_modules/
	@echo "Clean completed!"

# Watch mode for development
watch:
	@echo "Starting watch mode..."
	npm run watch

# Package extension
package: build
	@echo "Packaging extension..."
	@mkdir -p bin
	npx vsce package --out bin/
	@echo "Package created successfully in bin/!"

# Run tests
test:
	@echo "Running tests..."
	npm test
