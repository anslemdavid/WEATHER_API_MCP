"""Serve the bundled animated weather dashboard on localhost."""

from __future__ import annotations

import argparse
import http.server
import socketserver
import webbrowser
from pathlib import Path

WEB_DIR = Path(__file__).parent / "web"


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, format: str, *args) -> None:
        # Keep terminal output quiet; HTTP errors are still handled normally.
        pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the animated live weather dashboard")
    parser.add_argument("--host", default="127.0.0.1", help="interface to bind (default: localhost only)")
    parser.add_argument("--port", type=int, default=8000, help="port to serve on")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser automatically")
    args = parser.parse_args()

    with socketserver.ThreadingTCPServer((args.host, args.port), DashboardHandler) as server:
        server.daemon_threads = True
        url = f"http://{args.host}:{args.port}"
        print(f"Weather dashboard is available at {url} (Ctrl+C to stop)")
        if not args.no_browser and args.host in ("127.0.0.1", "localhost"):
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nDashboard stopped.")


if __name__ == "__main__":
    main()
