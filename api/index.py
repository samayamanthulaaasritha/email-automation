import os
import sys

# Ensure root and backend directories are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, 'backend')

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set VERCEL environment variable flag if running in Vercel
if os.environ.get('VERCEL') or 'VERCEL' in os.environ:
    os.environ['VERCEL'] = '1'

try:
    from backend.app import create_app
except ImportError:
    from app import create_app

# Vercel Serverless Function entrypoint
app = create_app()

if __name__ == '__main__':
    app.run()
