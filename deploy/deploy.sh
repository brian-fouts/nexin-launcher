#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(dirname "$SCRIPT_DIR")

ZIP_PATH=$(mktemp -d)
DNS=ec2-23-22-245-182.compute-1.amazonaws.com
pushd $ROOT_DIR
zip -r $ZIP_PATH/nexin.zip ./*

scp -ri $HOME/.ssh/nexin-keypair.pem $ZIP_PATH/nexin.zip ec2-user@$DNS:/home/ec2-user/
ssh -i $HOME/.ssh/nexin-keypair.pem ec2-user@$DNS unzip -o /home/ec2-user/nexin.zip -d /home/ec2-user/app
ssh -i $HOME/.ssh/nexin-keypair.pem ec2-user@$DNS /home/ec2-user/app/deploy/start.sh
