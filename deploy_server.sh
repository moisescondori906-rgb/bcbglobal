#!/bin/bash
# Deploy script for BCB Global

# Set working directory (adjust if needed)
cd /root/bcbglobal || { echo "Failed to cd to /root/bcbglobal"; exit 1; }

# Pull latest changes from git
echo "Pulling latest changes..."
git pull origin main

# Go to backend directory
cd backend || { echo "Failed to cd to backend"; exit 1; }

# Run the database migration
echo "Running database migration..."
node migrations/024_bcb_global_master_upgrade.mjs

# Check if the service is using PM2 and restart it
if command -v pm2 &> /dev/null; then
  echo "Restarting PM2 process..."
  # Replace 'bcb-global-backend' with your actual PM2 process name if needed
  pm2 restart bcb-global-backend || echo "PM2 restart failed, trying to start all..." && pm2 restart all
else
  echo "PM2 not found. Please restart your backend service manually."
fi

echo "Deployment complete!"