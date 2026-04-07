# AWS EC2 Deployment Guide

This guide walks you through deploying SyncCode to AWS EC2 with Nginx reverse proxy and PM2 process management.

## Prerequisites

- AWS Account
- EC2 instance (recommended: t2.medium or larger)
- Ubuntu 22.04 LTS
- Domain name (optional, for production)

## Automated Deployment

```bash
# Clone the repository
git clone https://github.com/yourusername/SyncCode.git
cd SyncCode

# Run automated setup
chmod +x deployment/setup-ec2.sh
./deployment/setup-ec2.sh
```

The script will automatically:
- Install Node.js 20, Docker, Redis, Nginx
- Build Docker images for Python and C++
- Install application dependencies  
- Configure Nginx reverse proxy
- Start the application with PM2

## Manual Deployment Steps

</ If you prefer manual deployment:

### 1. Provision EC2 Instance

1. Launch Ubuntu 22.04 LTS instance (t2.medium minimum)
2. Configure security groups:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 3001 (Node.js - for testing only, close in production)

### 2. Install Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Redis
sudo apt-get install -y redis-server
sudo systemctl start redis-server

# Install Nginx
sudo apt-get install -y nginx

# Install PM2
sudo npm install -g pm2
```

### 3. Clone and Build

```bash
git clone https://github.com/yourusername/SyncCode.git
cd SyncCode

# Install client dependencies
cd client
npm install
npm run build

# Install server dependencies
cd ../server
npm install
cd ..
```

### 4. Build Docker Images

```bash
sudo docker pull python:3.11-slim
sudo docker pull gcc:13
```

### 5. Configure Nginx

```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/synccode
sudo ln -s /etc/nginx/sites-available/synccode /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Update domain in nginx.conf
sudo nano /etc/nginx/sites-available/synccode

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Start Application

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup
```

## SSL Configuration (Production)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## Monitoring

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs synccode-server

# Monitor resources
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Performance Tuning

### Increase File Descriptors (for 100+ connections)

```bash
# Edit limits.conf
sudo nano /etc/security/limits.conf

# Add these lines:
* soft nofile 65536
* hard nofile 65536
```

### PM2 Cluster Mode

The ecosystem.config.js is already configured for 4 instances. Adjust based on your CPU cores:

```javascript
instances: 'max'  // Use all available CPU cores
```

## Troubleshooting

### Check if services are running
```bash
sudo systemctl status nginx
sudo systemctl status redis-server
pm2 status
```

### Docker permissions
```bash
sudo chmod 666 /var/run/docker.sock
```

### View application logs
```bash
pm2 logs synccode-server --lines 100
```

### Restart application
```bash
pm2 restart synccode-server
```

## Cost Optimization

- **Development**: t2.micro (free tier eligible)
- **Testing**: t2.small
- **Production**: t2.medium or larger
- Consider spot instances for 70% cost savings

## Next Steps

1. Set up custom domain with Route 53
2. Configure SSL/TLS certificates
3. Set up CloudWatch monitoring
4. Configure automated backups
5. Implement CDN with CloudFront

## Support

For issues, check:
- Server logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `sudo docker logs <container_id>`
