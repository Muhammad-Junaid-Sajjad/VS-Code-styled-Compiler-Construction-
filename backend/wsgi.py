"""Production WSGI entry point (T054a / FR-055): `make run-prod`.

Serves the built SPA + API under Waitress with debug=False.
"""
import os

from app import app

if __name__ == '__main__':
    from waitress import serve
    host = '0.0.0.0'
    port = int(os.environ.get('PORT', '5000'))
    print(f"CompileViz serving on http://{host}:{port} (production, debug=False)")
    serve(app, host=host, port=port)
