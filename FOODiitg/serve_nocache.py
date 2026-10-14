import http.server
import socketserver

PORT = 8080

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"IITG Eats server running at http://localhost:{PORT}/")
    print(f"Student App : http://localhost:{PORT}/index.html")
    print(f"Admin Portal: http://localhost:{PORT}/admin.html")
    print(f"Canteen     : http://localhost:{PORT}/vendor.html")
    print(f"Delivery    : http://localhost:{PORT}/rider.html")
    print("All responses served with no-cache headers.")
    httpd.serve_forever()
