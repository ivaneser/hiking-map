#!/bin/bash

# Hiking Map Local Development Server
# Start server on port 8765 for local testing

PORT=${1:-8765}
echo "=========================================="
echo "  Hiking Map - Local Development Server"
echo "=========================================="
echo ""
echo "Starting server at http://localhost:${PORT}"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

# Create dist folder if needed
mkdir -p dist || true

# If files are in root (for deployment), copy them
if [ ! -d "scripts" ] && [ ! -d "config" ]; then
  echo "Files are in root level (deployment structure)"
elif [ -f "scripts/script.js" ]; then
  # Files in scripts/ folder - for development with webpack/other bundlers
  echo "Development mode: using scripts/ folder"
fi

# Start simple HTTP server
echo ""
echo "🚀 Starting local server..."
echo ""

node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = $PORT;
const ROOT_DIR = process.cwd();
const BUILD_DIR = path.join(ROOT_DIR, 'dist');

// Create dist folder if needed and copy files for first run
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR);
}

// Function to serve file from root or dist
function serveFile(req, res, filePath) {
  const fullPath = path.join(ROOT_DIR, filePath.replace(/^\\.\//, ''));
  
  fs.stat(fullPath, (err, stats) => {
    if (err) {
      // File not found in root
      return res.writeHead(404).end('File not found');
    }
    
    let content = '';
    let mimeType = 'application/octet-stream';
    
    // Determine MIME type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    if (ext === '.html') mimeType = 'text/html; charset=utf-8';
    else if (ext === '.css') mimeType = 'text/css';
    else if (ext === '.js') mimeType = 'application/javascript';
    
    fs.readFile(fullPath, 'utf8', (err, data) => {
      if (err) {
        return res.writeHead(500).end('Error reading file');
      }
      
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  
  // Route requests to serve files from root directory
  let filePath = url.startsWith('/') ? url.slice(1) : url;
  if (filePath.charAt(0) !== '.') filePath = './' + filePath;
  
  console.log('[' + new Date().toLocaleTimeString() + '] ' + req.method + ' ' + req.url);
  
  serveFile(req, res, filePath);
});

server.listen(PORT, 'localhost', () => {
  console.log('');
  console.log('========================================');
  console.log('✅ Server running at:');
  console.log('   http://localhost:' + PORT);
  console.log('========================================');
  console.log('');
  console.log('📁 Files available:');
  console.log('   index.html     - Main page');
  console.log('   api-keys.js    - API key storage');
  console.log('   config.js      - Config loader');
  console.log('   script.js      - Main app logic');
  console.log('   style.css      - Stylesheet');
  console.log('   setup-api-keys.js - Setup modal');
  console.log('========================================');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Error: Port ' + PORT + ' is already in use!');
    console.error('Try stopping the server or using a different port.');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
" &

# Get the node process ID and save it for clean shutdown
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start before showing menu
sleep 2

# Show help options
cat << HELP
========================================
 Hiking Map - Local Development Server
========================================

Available commands (type 'help'):
-----------------------------------------
  restart    - Restart the server
  status     - Check if server is running
  stop       - Stop the server
  test       - Run validation tests
  open       - Open in browser automatically
HELP

trap "kill $SERVER_PID 2>/dev/null" SIGINT SIGTERM

while true; do
    read -p "$(tput setaf 34)[local:8765]$(tput sgr0) > " command
    
    case $command in
        restart)
            kill $SERVER_PID 2>/dev/null
            sleep 1
            start-local-server.sh
            break
            ;;
        status)
            if ps -p $SERVER_PID > /dev/null; then
                echo "✅ Server is running (PID: $SERVER_PID)"
            else
                echo "❌ Server is not running"
            fi
            ;;
        stop)
            kill $SERVER_PID 2>/dev/null
            echo "Server stopped"
            exit 0
            ;;
        test)
            bash .prepush-test.sh 2>/dev/null || echo "Validation errors found - check above output"
            ;;
        open)
            local OPEN_PORT=${OPEN_PORT:-8765}
            if [ -n "$OPEN_PORT" ]; then
                start-url="http://localhost:$OPEN_PORT"
            else
                start-url="http://localhost:$PORT"
            fi
            echo "Opening browser..."
            xdg-open "$start-url" 2>/dev/null || open "$start-url" 2>/dev/null || start "$start-url" 2>/dev/null || echo "Please open http://localhost:$PORT manually"
            ;;
        help|*)
            cat << HELP
========================================
 Hiking Map - Local Development Server
========================================

Type 'help' for this menu.

Quick actions:
-----------------------------------------
  restart    - Restart the server
  status     - Check if server is running  
  stop       - Stop the server
  test       - Run pre-push validation
  open       - Open in browser
  
To quit, type: exit
HELP
            ;;
    esac
done

wait $SERVER_PID 2>/dev/null || true
