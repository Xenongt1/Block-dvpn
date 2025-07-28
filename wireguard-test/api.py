from flask import Flask, send_file, jsonify
import subprocess
import os
from pathlib import Path

app = Flask(__name__)

@app.route('/generate-peer', methods=['POST'])
def generate_peer():
    try:
        # Run the generate_peer.py script
        result = subprocess.run(['python3', 'generate_peer.py'], 
                             capture_output=True, 
                             text=True)
        
        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500

        # Parse output to find the config file path
        for line in result.stdout.split('\n'):
            if 'Configuration saved to:' in line:
                config_path = line.split('Configuration saved to:')[1].strip()
                return send_file(config_path, 
                               mimetype='application/x-wireguard-config',
                               as_attachment=True,
                               download_name='wg0-client.conf')
        
        return jsonify({'error': 'Config file not found'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 