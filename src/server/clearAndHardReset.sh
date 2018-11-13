#!/bin/bash

# Put this in the /usr/local/bin/ folder and chmod the file with sudo chmod +x 
systemctl stop squid
echo "squid stopped"
rm -Rf /var/spool/squid/
echo "removed the cache dirs"
mkdir /var/spool/squid
echo "made the cache dir again"
chown pi:pi /var/spool/squid
echo "set chown for the new folder"
squid -z
echo "ran squid -z to setup thr cache again and calling sudo reboot next"
systemctl restart squid
echo "restarted squid"
reboot
