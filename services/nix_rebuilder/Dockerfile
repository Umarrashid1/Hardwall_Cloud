FROM nixos/nix

# Install any additional packages you need
RUN nix-env -iA nixpkgs.git

# Set up the working directory
WORKDIR /workspace

# Copy your NixOS configuration files into the container
COPY . /workspace

# Set the entrypoint to bash
ENTRYPOINT ["/bin/bash"]