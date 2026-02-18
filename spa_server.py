from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve index.html for known SPA routes if file doesn't exist
        path = self.path.split('?')[0]
        if path == '/' or path == '/index.html':
            super().do_GET()
        elif path.startswith('/verification/'): # Allow verification artifacts
            super().do_GET()
        elif '.' in path: # Likely a static asset (js, css, png)
            super().do_GET()
        else:
            # Serve index.html for SPA routes like /login, /dashboard
            self.path = '/index.html'
            super().do_GET()

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, SPAHandler)
    print("Serving SPA on port 8000...")
    httpd.serve_forever()
