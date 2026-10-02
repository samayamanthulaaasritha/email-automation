import sys
import os

# Ensure backend directory is in Python path for Vercel Serverless Function runtime
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Set VERCEL environment variable flag if running in Vercel
if os.environ.get('VERCEL') or 'VERCEL' in os.environ:
    os.environ['VERCEL'] = '1'

from app import create_app

# Vercel looks for the WSGI application named `app`
app = create_app()

if __name__ == '__main__':
    app.run()
