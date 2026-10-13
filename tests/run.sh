#!/bin/bash
# Runs tests/drive.html in headless Edge, in real time, and prints what each scenario reported.
# Usage (Git Bash, from anywhere):  bash tests/run.sh
# It starts its own local server and stops it, and the browser, when done. Exits 1 if any scenario reported a problem.
cd "$(dirname "$0")/.." || exit 1
node tests/model.test.mjs || exit 1
PY="$LOCALAPPDATA/Programs/Python/Python313/python.exe"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
PORT=8765
stamp=$(date +%s)
log="$TEMP/vektor-test-$stamp.log"
prof="$TEMP/vektor-edge-$stamp"

"$PY" -m http.server $PORT --bind 127.0.0.1 > "$log" 2>&1 &
server=$!
sleep 1
"$EDGE" --headless=new --disable-gpu --window-size=500,900 --user-data-dir="$prof" "http://127.0.0.1:$PORT/tests/drive.html?run=$stamp" >/dev/null 2>&1 &

# The page reports each scenario by requesting /__result?...; the requests show up in the server log.
for t in $(seq 1 400); do sleep 0.5; grep -q "run=$stamp&name=done" "$log" && break; done
out=$(grep -o "__result?run=$stamp&name=[^ ]*" "$log" | PYTHONIOENCODING=utf-8 "$PY" -c "
import sys, urllib.parse
for line in sys.stdin:
    q = urllib.parse.parse_qs(line.strip().split('?', 1)[1])
    print('== ' + q['name'][0])
    for part in q.get('log', [''])[0].split(' ## '): print('   ' + part)
")
echo "$out"

kill $server 2>/dev/null
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'msedge.exe'\" | Where-Object { \$_.CommandLine -like '*vektor-edge-$stamp*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
sleep 1
rm -rf "$prof" "$log" 2>/dev/null

if ! echo "$out" | grep -q "== done"; then echo "FAILED: the run did not finish"; exit 1; fi
# Signs of a slip that the scenarios would otherwise print without complaint.
if echo "$out" | grep -qE 'ERROR |script errors: [^n]|page overflow: true|\[object |undefined|NaN|Invalid Date'; then echo "FAILED: see the lines above"; exit 1; fi
echo "All scenarios finished with no errors."
