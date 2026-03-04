#!/bin/bash
# Usage:
#   ./start.sh          — local: Vite + Python debug
#   ./start.sh deploy   — deploy: Python production, built frontend served by backend
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(dirname "$SCRIPT_DIR")

cd "$ROOT_DIR"

if [ "$1" = "deploy" ]; then
  docker-compose -f docker-compose.deploy.yml down
  docker-compose -f docker-compose.deploy.yml up --build -d
else
  docker-compose down
  docker-compose up --build
fi
