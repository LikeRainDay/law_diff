#!/bin/bash
# start_backend.sh

echo "🚀 Starting Law Comparison Backend..."
echo "📂 Working directory: $(pwd)"

# Check if port 8000 is already in use
if lsof -i :8000 > /dev/null; then
    echo "⚠️  Port 8000 is already in use. Attempting to kill the process..."
    lsof -ti :8000 | xargs kill -9
    echo "✅ Process killed."
fi

# Run cargo check first to ensure dependencies are resolved
echo "📦 Checking dependencies..."
cargo check

# Run the backend
echo "▶️  Running backend..."
RUST_LOG=law_compare_backend=debug,tower_http=debug cargo run --release
