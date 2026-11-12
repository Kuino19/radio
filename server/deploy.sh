#!/bin/bash
# LISNR Backend Deployment on Ubuntu 24.04 VM (Azure)
set -e

echo "=== 1. Checking Node.js and ffmpeg ==="
# Ensure Node.js 20+ is installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Ensure ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing ffmpeg..."
    sudo apt-get update && sudo apt-get install -y ffmpeg
fi

echo "=== 2. Installing Backend Dependencies ==="
npm install --production

echo "=== 3. Setting up Systemd Service ==="
sudo cp lisnr-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable lisnr-backend
sudo systemctl restart lisnr-backend

echo "=== 4. Checking Service Status ==="
sudo systemctl status lisnr-backend --no-pager
