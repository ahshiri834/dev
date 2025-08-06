# Laravel Dev

Starter template running Laravel 12 on PHP 8.3 with Docker.

## Requirements
- Docker & Docker Compose
- Make

## Setup
1. Copy `.env.example` to `.env`.
2. Start services:
   ```bash
   make up
   ```
3. Install dependencies and generate key:
   ```bash
   make composer cmd="install"
   make artisan cmd="key:generate"
   ```
4. Open <http://localhost:8000/health> to verify the stack (returns `{ "status": "healthy" }`).

## Tests
Run code style, static analysis and tests:
```bash
vendor/bin/pint --test
vendor/bin/phpstan analyse --configuration=phpstan.neon.dist
vendor/bin/pest
```

GitHub Actions executes the same steps on every push and pull request.
