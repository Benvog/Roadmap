#!/bin/bash
# Loads the real app page in headless Edge, in real time, and checks the sign-in screen draws.
# Usage (Git Bash, from anywhere):  bash tests/load.sh [times]     (default 2)
# tests/run.sh drives the app through a stand-in store, so it cannot notice the real page failing to start
# (a bad import in main.js or store.js, say). This does. It starts and stops its own server and browser.
cd "$(dirname "$0")/.." || exit 1
PY="$LOCALAPPDATA/Programs/Python/Python313/python.exe"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
PORT=8767
stamp=$(date +%s)
log="$TEMP/vektor-load-$stamp.log"
"$PY" tools/serve.py $PORT > "$log" 2>&1 &
sleep 1
failed=0
for i in $(seq 1 ${1:-2}); do
  prof="$TEMP/vektor-edge-$stamp-$i"
  "$EDGE" --headless=new --disable-gpu --user-data-dir="$prof" "http://127.0.0.1:$PORT/tests/load.html?run=$stamp-$i" >/dev/null 2>&1 &
  for t in $(seq 1 30); do sleep 0.5; grep -q "run=$stamp-$i&" "$log" && break; done
  line=$(grep -o "__result?run=$stamp-$i&[^ ]*" "$log" | tail -1)
  echo "load $i: ${line#*&}"
  echo "$line" | grep -q "drew=Sign%20in" || failed=1
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'msedge.exe'\" | Where-Object { \$_.CommandLine -like '*vektor-edge-$stamp-$i*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
done
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
sleep 1
rm -rf "$TEMP"/vektor-edge-$stamp-* "$log" 2>/dev/null
if [ $failed = 1 ]; then echo "FAILED: the real page did not draw the sign-in screen"; exit 1; fi
echo "The real page loads."
