#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Start Minikube
echo "Starting Minikube..."
# minikube start
# minikube addons enable ingress

# Apply all YAML files in the ./kubernetes/ directory
echo "Applying Kubernetes configurations..."
kubectl apply -f ./kubernetes/main_yamls/
echo "Minikube started and Kubernetes configurations applied successfully."
kubectl get all

alias kub="minikube kubectl --"
echo "minikube kubectl abbreviated as kub"
sleep 5
minikube ip
#kubectl port-forward service/backend-service 8080:3000
# minikube tunnelmin