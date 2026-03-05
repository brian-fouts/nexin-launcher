#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(dirname "$SCRIPT_DIR")

ZIP_PATH=$(mktemp -d)
DNS=ec2-23-22-245-182.compute-1.amazonaws.com
pushd $ROOT_DIR
zip -r $ZIP_PATH/nexin.zip ./* -x "*node_modules*"

REMOTE_SCRIPT=/home/ec2-user/nexin-deploy.sh

scp -i $HOME/.ssh/nexin-keypair.pem $ZIP_PATH/nexin.zip ec2-user@$DNS:/home/ec2-user/
scp -i $HOME/.ssh/nexin-keypair.pem "$SCRIPT_DIR/remote-deploy.sh" ec2-user@$DNS:"$REMOTE_SCRIPT"
ssh -i $HOME/.ssh/nexin-keypair.pem ec2-user@$DNS "chmod +x $REMOTE_SCRIPT && $REMOTE_SCRIPT"
