#!/bin/sh
set -e

# Permissions self-hosted : par défaut nobody:users (99:100, ex. Unraid).
# Surchargez PUID/PGID via l'environnement (docker-compose.yml) selon votre hôte.
PUID=${PUID:-99}
PGID=${PGID:-100}

# Le conteneur démarre en root : on aligne le propriétaire du volume monté
# (/data) sur PUID:PGID à chaque démarrage, puis on droppe les privilèges.
# C'est ce qui évite l'erreur SQLITE_READONLY quand le fichier vient d'un rsync.
mkdir -p /data
chown -R "$PUID:$PGID" /data

# Droppe les privilèges et lance le serveur Nitro en tant que PUID:PGID.
exec gosu "$PUID:$PGID" "$@"
