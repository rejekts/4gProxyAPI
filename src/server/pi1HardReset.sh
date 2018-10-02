#!/bin/bash
USERNAME=pi
HOSTS="172.30.230.10"
SCRIPT="sudo reboot"
for HOSTNAME in ${HOSTS} ; do
    ssh -l ${USERNAME} ${HOSTNAME} "${SCRIPT}"
done