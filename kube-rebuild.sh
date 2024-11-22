#!/bin/bash

echo "Deleting all minikube instances"
minikube delete --all

echo "Starting Minikube again..."
minikube start
minikube addons enable ingress

# Apply all YAML files in the ./kubernetes/ directory
echo "Applying Kubernetes configurations..."
kubectl apply -f ./kubernetes/main_yamls/

sleep 3
alias kub="minikube kubectl --"
echo "minikube kubectl abbreviated as kub"

kubectl get all
minikube ip

#kubectl port-forward service/backend-service 8080:3000
# minikube tunnelmin