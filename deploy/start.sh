#!/bin/bash
# Production only. Start the deploy stack (built frontend, backend, nginx, etc.).
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(dirname "$SCRIPT_DIR")

cd "$ROOT_DIR"

# Aggressive cleanup of unused Docker resources without stopping running containers.
docker system prune -a -f --volumes
docker builder prune -a -f

# Deploy/update in place to avoid full-stack downtime.
docker-compose -f docker-compose.deploy.yml up --build -d --remove-orphans
