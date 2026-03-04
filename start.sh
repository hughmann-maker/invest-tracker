#!/bin/bash
echo "Starting Invest Portfolio Tracker..."

echo "Checking dependencies..."
npm install --no-audit

echo "Freeing port 3000 (killing previous process if running)..."
PORT_PID=$(lsof -ti :3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
    echo "Found process $PORT_PID on port 3000, terminating..."
    kill -9 $PORT_PID 2>/dev/null
fi

# Delete old lock file if it exists
if [ -f ".next/dev/lock" ]; then
    rm -f ".next/dev/lock"
    echo "Lock file removed."
fi

echo "Starting Next.js server..."
sleep 1

# Use production build for better performance on Raspberry Pi
if [ "$1" = "--dev" ]; then
    echo "Running in DEVELOPMENT mode..."
    npm run dev
else
    echo "Building for production (recommended for Raspberry Pi)..."
    npm run build
    echo "Starting production server..."
    npm start
fi
