#!/bin/bash
DNS=ec2-23-22-245-182.compute-1.amazonaws.com
ssh -i $HOME/.ssh/nexin-keypair.pem ec2-user@$DNS
