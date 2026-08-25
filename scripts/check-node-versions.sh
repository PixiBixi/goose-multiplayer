#!/usr/bin/env bash
# The image once shipped Node 22 while everything else validated 24. The floor
# in `engines` is what this supports; `.nvmrc` is what it runs on. They are not
# the same number, and every Dockerfile stage must follow .nvmrc.
set -euo pipefail

cd "$(dirname "$0")/.."

nvmrc="$(tr -d '[:space:]' < .nvmrc)"

if [[ ! -f Dockerfile ]]; then
  echo "Dockerfile not found" >&2
  exit 1
fi

# Every stage, not just the first: the build stage and the runtime stage have
# drifted apart before, and the runtime one is the version production runs.
stages=""
count=0
while read -r stage; do
  stages="${stages} ${stage}"
  count=$((count + 1))
  if [[ "$nvmrc" != "$stage" ]]; then
    echo "Dockerfile pins node ${stage} but .nvmrc says ${nvmrc}" >&2
    exit 1
  fi
done < <(grep -oE '^FROM node:[0-9]+' Dockerfile | cut -d: -f2)

if [[ "$count" -eq 0 ]]; then
  echo "Dockerfile pins no node version" >&2
  exit 1
fi

echo "node ${nvmrc} in .nvmrc and in all ${count} Dockerfile stages"
