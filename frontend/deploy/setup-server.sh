#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu Lightsail instance.
# Run this on the instance itself (as the `ubuntu` user), from this directory:
#   scp -r frontend/deploy ubuntu@<instance-ip>:~/deploy
#   ssh ubuntu@<instance-ip> 'cd ~/deploy && bash setup-server.sh'

set -euo pipefail

sudo apt-get update
sudo apt-get install -y nginx

sudo mkdir -p /var/www/bookqik-crm/current
sudo chown -R "$USER":"$USER" /var/www/bookqik-crm

sudo cp nginx.conf /etc/nginx/sites-available/crm
sudo ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "Done. /var/www/bookqik-crm/current is served by nginx on port 80."
echo "Point GitHub Actions' LIGHTSAIL_HOST/LIGHTSAIL_USER secrets at this box (user: ubuntu)."
