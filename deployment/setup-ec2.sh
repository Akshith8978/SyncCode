#!/bin/bash

# SyncCode AWS EC2 Deployment Script
# This script automates the deployment of SyncCode on a fresh Ubuntu EC2 instance

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SyncCode Deployment Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Redis
echo "📦 Installing Redis..."
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Build Docker images for code execution
echo "🐳 Building Docker execution images..."
sudo docker pull python:3.11-slim
sudo docker pull gcc:13

echo "✓ Docker images built"

# Install application dependencies
echo "📦 Installing application dependencies..."

# Client dependencies
cd client
npm install
npm run build
cd ..

# Server dependencies
cd server
npm install
cd ..

# Configure Nginx
echo "🔧 Configuring Nginx..."
sudo cp deployment/nginx.conf /etc/nginx/sites-available/synccode
sudo ln -sf /etc/nginx/sites-available/synccode /etc/nginx/sites-enabled/synccode
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx

# Create logs directory
mkdir -p logs

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your SyncCode server is now running!"
echo ""
echo "To check status:"
echo "  pm2 status"
echo "  pm2 logs synccode-server"
echo ""
echo "To restart:"
echo "  pm2 restart synccode-server"
echo ""
echo "Next steps:"
echo "1. Update nginx.conf with your domain name"
echo "2. Set up SSL with Let's Encrypt (certbot)"
echo "3. Configure firewall rules"
echo ""
