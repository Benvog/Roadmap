"""Serves the project for local work, at http://localhost:8000.

Run from the repo root:  "%LOCALAPPDATA%\\Programs\\Python\\Python313\\python.exe" tools/serve.py

Unlike plain `python -m http.server`, this tells the browser never to keep a copy of a file. Without that, a browser
can go on using an old copy of one script for hours while loading the new version of another, and the app breaks in
ways that look like a lost connection.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoStore(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Serving on http://localhost:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), NoStore).serve_forever()
