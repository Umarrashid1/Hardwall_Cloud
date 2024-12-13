# Configure a trusted user
# add public SSH key of the machine that will use that builder
# add CLI flag to nixos-rebuild to use a remote builder: sudo nixos-rebuild switch --flake . --builders "ssh://myuser@builder <other builder specification>"
# or add nix.buildMachines to nixos config to not have to use --builders flag. dont forget to set nix.distributedBuilds to true to enable the buildMachines.

#####
# ChatGPT gave me this...
#####
from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/build', methods=['POST'])
def build():
    try:
        # Parse the request JSON
        request_data = request.get_json()
        device = request_data.get("device")
        nix_config = request_data.get("nix_config")
        
        if not device or not nix_config:
            return jsonify({"error": "Device or Nix configuration missing"}), 400
        
        # Build command for the third device
        build_command = [
            "nix-build", nix_config, "--option", "build-host", device
        ]
        
        build_process = subprocess.run(
            build_command, capture_output=True, text=True
        )

        # Prepare response
        if build_process.returncode == 0:
            return jsonify({
                "status": "success",
                "output": build_process.stdout.strip()
            })
        else:
            return jsonify({
                "status": "error",
                "error": build_process.stderr.strip()
            }), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
