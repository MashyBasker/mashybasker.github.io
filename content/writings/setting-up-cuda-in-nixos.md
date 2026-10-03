---
title: "Setting up CUDA and NVIDIA drivers in NixOS"
date: "2026-09-30"
---

> look at [tl;dr](#tldr) if you're only interested in getting the config

## the why of it
every now and then i see an X post on ml compilers or someone asking the correct roadmap to become an inference engineer for the n-th time. this scratched the part of my brain that scolds me for not knowing thing. So, i figured i might as well have a taste of it and decide if i will enjoy it.

i know i'm pretty late to it. the frontier has moved leaps and bounds, i feel almost everyone (or atleast those in my timeline) knows all about or already learning it. But, the good thing about being a little late is that the literature is laid out pretty well now and there's more resources to rabbithole into.

i am going to start with basic cuda first. i have an rtx 3050ti which i think will be good enough for the time being.

## meat and potatoes

i like my things organised well, so i created a folder with a `shell.nix` file. this file would declare all the things i need such as `nvcc`, `nvidia-smi`, etc. currently, the file looks like this.

```
{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

pkgs.mkShell {
  name = "cuda-env";

  buildInputs = [
    pkgs.cudatoolkit
    pkgs.gcc12
  ];

  shellHook = ''
    export CUDA_PATH=${pkgs.cudatoolkit}
  '';
}
```

the cudatoolkit contains the `nvcc` compiler along with other tools (`ptxas`, `cuobjdump`, etc.), runtime headers, specialized apis like cufft, cublas, etc. along with this, we need the correct c/c++ compiler for nvcc.

this was good to go. so i ran `nix-shell` to build a new shell with all the dependencies and to test if it worked, i used the `nvidia-smi` command _and_ it did not work.

```text
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver. Make sure that the latest NVIDIA driver is installed and running.
```

of course.

## get the driver

nvidia drivers in linux is always a pain. i figured i should take a look at the friendly manual [here](https://nixos.wiki/wiki/Nvidia).

first thing i realised is that i need to configure nvidia prime, since i've got both integrated (amd) and dedicated (nvidia) gpus. with this configuration, i can put my nvidia gpu to sleep unless it is explicitly called for some process, thereby optimizing power usage. this works perfectly for me, since i will probably only use it to run cuda code.

while we're at it, we might as well make the graphics gpu accelerated. to do this, we need to add the following lines to `/etc/nixos/configuration.nix`

```
hardware.graphics = {
  enable = true;
  enable32Bit = true;
};
```

this would let opengl be used for graphics via wayland or x11. the `enable32Bit` is for backwards compatibility with the 32-bit applications in a 64-bit host.

to use `nvidia` graphics drivers, we will add the following line:

```
services.xserver.videoDrivers = [ "nvidia" ];
```

now, we need to choose which nvidia kernel modules to install. open source modules are preferred over proprietary ones. from the turing architecture onwards, the open-source models are supported. data center gpus like grace hopper or blackwell don't even support proprietary drivers anymore. to do so, we add the line

```
hardware.nvidia.open = true;
```

> make sure to have `nixpkgs.config.allowUnfree` set to `true` in the `configuration.nix` file because the nvidia drivers have an unfree license.

to configure the nvidia drivers with prime we add the following lines,

```
hardware.nvidia = {
  prime = {
    offload.enable = true;
    offload.enableOffloadCmd = true;
    amdgpuBusId = "PCI:6:0:0";
    nvidiaBusId = "PCI:1:0:0";
  };
};
```

what this does is use the amd gpu for rendering unless nvidia gpu is called explicitly by using `nvidia-offload <app>`. we also need the bus ids of the nvidia and the amd gpu respectively by using the command

```shell
lspci | grep -E 'VGA|3D'
```

you'll get an output like this

```shell
01:00.0 VGA compatible controller: NVIDIA Corporation GA107M [GeForce RTX 3050 Ti Mobile] (rev a1)
06:00.0 VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] Rembrandt [Radeon 680M] (rev c8)
```

the numbers at the beginning are the bus ids. to use them in the config, we need to convert them to the format `PCI:BUS:SLOT:FUNCTION` after converting the digits to hex.

for example, the nvidia bus will become

```shell
PCI:1:0:0
```

if you have an intel iGPU, the bus id name is `intelBusId`


## tldr

```
# add this in `/etc/nixos/configuration.nix` file

hardware.graphics = {
  enable = true;
  enable32Bit = true;
};

services.xserver.videoDrivers = [ "nvidia" ];

hardware.nvidia = {
  open = true;
  prime = {
    sync.enable = true;
    amdgpuBusId = "PCI:6:0:0";
    nvidiaBusId = "PCI:1:0:0";
  };
};
```

and

```
# add this in shell.nix file of the project directory

{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

pkgs.mkShell {
  name = "cuda-env";

  buildInputs = [
    pkgs.cudatoolkit
    pkgs.gcc12
  ];

  shellHook = ''
    export CUDA_PATH=${pkgs.cudatoolkit}
  '';
}
```

run `sudo nixos-rebuild switch` and perform a reboot. go to the work directory and run `nix-shell`, and you're good to go.

## now what

in the upcoming weeks i'll be tinkering with cuda and ml compilers/frameworks. since i'm interested in the optimization part, maybe some mlir as well? we'll see. i'll keep posting if i find anything cool or just anything i want to write about. cya :)