{ config, lib, pkgs, ... }:

let
  user = "guest";  # Replace with your desired username
  password = "guest";  # Replace with your desired password
  SSID = "AAU-1-DAY";  # Replace with your SSID
  SSIDpassword = "wall38only";  # Replace with your SSID password
  interface = "wlan0";  # Replace with your wireless interface
  hostname = "myhostname";  # Replace with your hostname
  nixosHardwareVersion = "7f1836531b126cfcf584e7d7d71bf8758bb58969";
in {
  # Import the Raspberry Pi 4 hardware configuration
  imports = [
    "${fetchTarball "https://github.com/NixOS/nixos-hardware/archive/${nixosHardwareVersion}.tar.gz"}/raspberry-pi/4"
  ];

  # Enable Raspberry Pi hardware options
  hardware.raspberry-pi."4" = {
    dwc2.enable = true;  # Enable the UDC controller to support USB OTG gadget functions
    dwc2.dr_mode = "otg";  # Set the desired dual role mode
  };

  # Boot configuration
  boot = {
    loader = {
      grub.enable = false;  # Disable GRUB for Raspberry Pi
      generic-extlinux-compatible.enable = true;  # Use extlinux for booting
    };
    kernelPackages = pkgs.linuxPackages_rpi4;  # Specify Raspberry Pi kernel packages

    # Kernel modules to load
    kernelModules = [
      "dwc2"               # Ensure dwc2 USB controller module is loaded
      "g_ether"            # Load the USB Ethernet gadget if you're using a network gadget
      "raw_gadget"         # Enable raw USB gadget functionality
    ];

    # Add necessary kernel parameters
    kernelParams = [
      "usb_raw_gadget=enabled"  # Ensure raw gadget functionality is enabled
    ];
  };

  # Device Tree configuration for dwc2
  hardware.deviceTree = {
    overlays = [
      {
        name = "dwc2-overlay";  # Name of the overlay
        dtsText = ''
          /dts-v1/;
          /plugin/;

          / {
            compatible = "brcm,bcm2711";

            fragment@0 {
              target = <&usb>;
              __overlay__ {
                compatible = "brcm,bcm2835-usb";
                dr_mode = "otg";
                g-np-tx-fifo-size = <0x20>;
                g-rx-fifo-size = <0x22e>;
                g-tx-fifo-size = <0x200 0x200 0x200 0x200 0x200 0x100 0x100>;
                status = "okay";
                phandle = <0x01>;
              };
            };
          };
        '';
      }
    ];
  };

  # Network configuration
  networking = {
    hostName = hostname;  # Set hostname
    wireless = {
      enable = true;  # Enable wireless networking
      networks."${SSID}".psk = SSIDpassword;  # Provide the wireless password
      interfaces = [ interface ];  # Set the wireless interface
    };
  };

  # File system configuration
  fileSystems = {
    "/" = {
      device = "/dev/disk/by-label/NIXOS_SD";  # Adjust this if your device label is different
      fsType = "ext4";  # Use ext4 file system
      options = [ "noatime" ];  # Performance optimization
    };
  };

  # System packages (make sure jsoncpp, gcc, and make are in here)
  environment.systemPackages = with pkgs; [
    linux-firmware
    vim                # Text editor
    qemu
    libusb1
    usbutils           # Utility to inspect USB devices
    jsoncpp           # Added jsoncpp here
    jsoncpp.dev
    gcc
    git
    gnumake
  ];

  # Start services
  services.openssh.enable = true;

  # User configuration
  users = {
    mutableUsers = false;  # Disable mutable user settings
    users."${user}" = {
      isNormalUser = true;  # Create a normal user
      password = password;  # Set user password
      extraGroups = [ "wheel" ];  # Allow sudo access
    };
  };

  # Set NixOS state version
  system.stateVersion = "23.11";  # Adjust as needed
}

