#!/bin/bash
USERNAME=pi
HOSTS=$1
SCRIPT="sudo nmcli connection up Verizon"
for HOSTNAME in ${HOSTS} ; do
    ssh -l ${USERNAME} ${HOSTNAME} "${SCRIPT}"
done
# sudo nmcli device disconnect cdc-wdm0; ip addr flush dev wwan0; sudo macchanger -r wwan0; sleep 60; sudo nmcli device connect cdc-wdm0