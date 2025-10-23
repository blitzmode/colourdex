import http.server
import socketserver
import webbrowser

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}/main.html")
    webbrowser.open(f"http://localhost:{PORT}/main.html")
    httpd.serve_forever()