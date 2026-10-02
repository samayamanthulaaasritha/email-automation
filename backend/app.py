import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from routes.health_routes import health_bp
from routes.sender_routes import sender_bp
from routes.campaign_routes import campaign_bp

def create_app():
    app = Flask(__name__)
    
    # Configure maximum file upload size (e.g. 32 MB for large Excel sheets)
    app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
    
    # Enable CORS for React frontend (default Vite dev server runs on 5173 or localhost)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(sender_bp, url_prefix='/api')
    app.register_blueprint(campaign_bp, url_prefix='/api')
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"success": False, "error": "File size exceeds maximum limit of 32MB."}), 413
        
    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({"success": False, "error": "Internal server error."}), 500
        
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "API endpoint not found."}), 404
        
    return app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app = create_app()
    print(f">> Email Automation Backend running on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
