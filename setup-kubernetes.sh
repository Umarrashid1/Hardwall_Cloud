#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Start Minikube
echo "Starting Minikube..."
# minikube start

# Apply all YAML files in the ./kubernetes/ directory
echo "Applying Kubernetes configurations..."
kubectl apply -f ./kubernetes/main_yamls/
echo "Minikube started and Kubernetes configurations applied successfully."
kubectl get all

sleep 5
#kubectl port-forward service/backend-service 8080:3000