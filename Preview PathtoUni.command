#!/bin/bash
# Double-click to open the site on this Mac, exactly as it will look when published.
# Serves the built site in dist/ at http://localhost:8000 . Close this window to stop it.
cd "$(dirname "$0")/dist" || { echo "No dist folder. Ask Claude to build the site."; read -n 1 -s; exit 1; }
PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "Path to Uni is running at http://localhost:$PORT/"
echo "Key dates page: http://localhost:$PORT/dates/"
echo
echo "Leave this window open while you look. Close it to stop."
(sleep 1; open "http://localhost:$PORT/dates/") &
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server $PORT --bind 127.0.0.1
else
  npx --yes http-server -p $PORT -a 127.0.0.1 -s
fi
