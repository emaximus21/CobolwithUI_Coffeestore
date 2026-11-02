#!/bin/sh
set -eu

if ! command -v cobc >/dev/null 2>&1; then
  printf '%s\n' 'GnuCOBOL compiler (cobc) was not found.' >&2
  printf '%s\n' 'In Codespaces, rebuild the container so .devcontainer/Dockerfile installs it.' >&2
  printf '%s\n' 'On Ubuntu, install it with: sudo apt-get update && sudo apt-get install -y gnucobol' >&2
  exit 1
fi

mkdir -p backend
cobc -x -free -Wall -o backend/shop backend/shop.cbl
printf '%s\n' 'Built backend/shop with GnuCOBOL.'