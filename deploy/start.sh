#!/bin/bash
# Production only. Start the deploy stack (built frontend, backend, nginx, etc.).
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(dirname "$SCRIPT_DIR")

cd "$ROOT_DIR"

docker-compose -f docker-compose.deploy.yml down
docker-compose -f docker-compose.deploy.yml up --build -d
