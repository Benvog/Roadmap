#!/bin/bash
# Checks the service worker in headless Edge: it installs and keeps the app's files, the app opens with the server
# stopped, and a changed file replaces the kept copy once the server is back.
# Usage (Git Bash, from anywhere):  bash tests/offline.sh
# It works on a copy of the app in a temp folder, so nothing in the repo is touched. Exits 1 on a problem.
cd "$(dirname "$0")/.." || exit 1
PY="$LOCALAPPDATA/Programs/Python/Python313/python.exe"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
PORT=8766
stamp=$(date +%s)
site="$TEMP/vektor-offline-$stamp"
log="$TEMP/vektor-offline-$stamp.log"
prof="$TEMP/vektor-edge-$stamp"

mkdir -p "$site" && cp -r index.html manifest.webmanifest sw.js css js assets tests "$site"/ || exit 1
serve() { (cd "$site" && exec "$PY" -m http.server $PORT --bind 127.0.0.1 >> "$log" 2>&1) & server=$!; sleep 1; }
stop_server() {
  kill $server 2>/dev/null
  powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
}
seen() { for t in $(seq 1 ${2:-80}); do grep -q "run=$stamp&name=$1" "$log" && return 0; sleep 0.5; done; return 1; }

serve
"$EDGE" --headless=new --disable-gpu --window-size=500,900 --user-data-dir="$prof" "http://127.0.0.1:$PORT/tests/offline.html?run=$stamp" >/dev/null 2>&1 &

if seen installed; then
  stop_server                                  # the page now finds the server gone and opens the app again
  sleep 8
  echo "/* offline-test-marker */" >> "$site/css/app.css"
  serve                                        # back online, with one file changed
  seen offline 60 && seen updated 60
fi
seen done 40

out=$(grep -o "__result?run=$stamp&name=[^ ]*" "$log" | PYTHONIOENCODING=utf-8 "$PY" -c "
import sys, urllib.parse
for line in sys.stdin:
    q = urllib.parse.parse_qs(line.strip().split('?', 1)[1])
    print('== ' + q['name'][0])
    for part in q.get('log', [''])[0].split(' ## '): print('   ' + part)
")
echo "$out"

stop_server
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'msedge.exe'\" | Where-Object { \$_.CommandLine -like '*vektor-edge-$stamp*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
sleep 1
rm -rf "$prof" "$site" "$log" 2>/dev/null

if ! echo "$out" | grep -q "== updated"; then echo "FAILED: the run did not get to the end"; exit 1; fi
if echo "$out" | grep -qE 'ERROR|NOTHING DREW|MISSING|worker ready: false|in charge of the page: false|styled: false|icon drew: false|kept one: false|missing from the kept copy: [^n]|server reachable: true'; then echo "FAILED: see the lines above"; exit 1; fi
echo "Offline check finished with no problems."
