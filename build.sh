#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

: > buildERROR.txt
: > buildLOG.txt
# for error handling
error_handler() {
    local lineno=$1
    local msg=$2
    echo "Error occurred in script at line: $lineno: $msg" | tee -a buildERROR.txt
    echo "Log output:" | tee -a buildERROR.txt
    cat buildLOG.txt | tee -a buildERROR.txt
    sleep 4
    exit 1
}

trap 'error_handler $LINENO "$BASH_COMMAND"' ERR

# Define Docker Hub username
DOCKERHUB_USERNAME="draellemeister"

# Define folders and their image names
declare -A folders=(
    ["./backend"]="backend"
    #["./frontend"]="frontend"
    ["./malware_predict"]="mal-predict"
    #["./malware_detect"]="malware_detect"
    #["./services/dyn_malware"]="dyn-malware"
    #["./services/HID-detection"]="hid-detection"
    #["./services/nix_rebuilder"]="nix-rebuilder"
)

# Redirect all output to a log file
exec > >(tee -a buildLOG.txt) 2>&1

# Build images in the folders
for folder in "${!folders[@]}"; do
    image_name=${folders[$folder]}
    echo "Building Docker image for $folder..."
    eval "docker build -t $image_name:latest $folder"
    echo "Successfully built $image_name:latest"
    echo "Pushing $image_name:latest to Docker Hub..."
    eval "docker tag $image_name:latest $DOCKERHUB_USERNAME/$image_name:latest"
    eval "docker push $DOCKERHUB_USERNAME/$image_name:latest"
    echo "Successfully pushed $image_name:latest to Docker Hub"
done

echo "All Docker images built successfully."
ech "---SUCCESS---"
sleep 2