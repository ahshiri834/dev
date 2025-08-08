APP_CONTAINER=php

up:
docker compose up -d

down:
docker compose down

composer:
docker compose run --rm $(APP_CONTAINER) composer $(cmd)

artisan:
docker compose run --rm $(APP_CONTAINER) php artisan $(cmd)

test:
docker compose run --rm $(APP_CONTAINER) ./vendor/bin/pest
