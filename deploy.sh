#!/usr/bin/env sh
# Deploiement Open TV Time sur un serveur auto-heberge (Docker).
# A lancer DEPUIS le serveur : pull via conteneur alpine/git, puis rebuild + restart.
# .env et data/ ne sont jamais touches.
#
# Usage (depuis le serveur, a la racine du projet) :
#   ./deploy.sh
set -eu

SERVICE_NAME=opentvtime
CONTAINER_PORT=3000
DEFAULT_HOST_PORT=3002
HEALTH_PATH=/api/health

# Racine du projet = dossier ou vit ce script.
PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$PROJECT_DIR"

echo "==> [1/3] git pull (conteneur alpine/git) dans $PROJECT_DIR"
docker run --rm -w /git -v "$PROJECT_DIR:/git" alpine/git pull

echo "==> [2/3] docker compose up -d --build"
docker compose up -d --build

echo "==> [3/3] etat + health"
docker compose ps

# Port hote publie pour le port conteneur 3000 (3002 par defaut dans docker-compose.yml).
PORT=$(docker compose port "$SERVICE_NAME" "$CONTAINER_PORT" 2>/dev/null | tail -n1 | sed 's/.*://')
PORT=${PORT:-$DEFAULT_HOST_PORT}

# Petit delai pour laisser le conteneur demarrer avant le check.
sleep 5
if curl -fsS "http://localhost:$PORT$HEALTH_PATH" >/dev/null 2>&1; then
  echo "OK : http://localhost:$PORT$HEALTH_PATH repond"
else
  echo "ATTENTION : $HEALTH_PATH ne repond pas encore sur le port $PORT (le conteneur demarre peut-etre)."
  echo "  -> docker compose logs --tail=50 $SERVICE_NAME"
fi
