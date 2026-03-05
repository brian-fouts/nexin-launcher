#!/bin/bash
# Runs on EC2. Extract release, copy .env, point app symlink, start services.
set -e

ZIP_PATH=/home/ec2-user/nexin.zip
APPS_DIR=/home/ec2-user/apps
APP_LINK=/home/ec2-user/app

RELEASE=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR=$APPS_DIR/$RELEASE

mkdir -p "$APPS_DIR"
unzip -o "$ZIP_PATH" -d "$RELEASE_DIR"
cp "/home/ec2-user/.env" "$RELEASE_DIR/.env"
rm -f "$APP_LINK"
ln -s "$RELEASE_DIR" "$APP_LINK"
"$APP_LINK/deploy/start.sh"
