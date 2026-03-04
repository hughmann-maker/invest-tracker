#!/bin/bash
echo "Starting Invest Portfolio Tracker..."

echo "Checking dependencies..."
npm install --no-audit

# Function to kill process on port 3000
kill_port() {
    if command -v fuser &> /dev/null; then
        fuser -k 3000/tcp 2>/dev/null && echo "Killed process on port 3000."
    elif command -v lsof &> /dev/null; then
        PORT_PID=$(lsof -ti :3000 2>/dev/null)
        if [ -n "$PORT_PID" ]; then
            echo "Found process $PORT_PID on port 3000, terminating..."
            kill -9 $PORT_PID 2>/dev/null
        fi
    else
        echo "Warning: neither fuser nor lsof found, cannot free port automatically."
    fi
}

echo "Freeing port 3000 (killing previous process if running)..."
kill_port

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
    kill_port
    npm run dev
else
    echo "Building for production (recommended for Raspberry Pi)..."
    npm run build
    echo "Starting production server..."
    # Kill port again right before starting (in case something respawned during build)
    kill_port
    sleep 1
    npm start
fi
