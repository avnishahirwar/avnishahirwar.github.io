#!/usr/bin/env sh
set -eu

# Copy only public website files into a clean hosting artifact directory.
# Usage: sh scripts/build-hosting-output.sh <output-directory>
output_dir="${1:?Usage: build-hosting-output.sh <output-directory>}"
mkdir -p "$output_dir"

find . -mindepth 1 -maxdepth 1 \
  ! -name "$output_dir" \
  ! -name ".git" \
  ! -name ".github" \
  ! -name "node_modules" \
  ! -name "tests" \
  ! -name "scripts" \
  ! -name ".gitlab-ci.yml" \
  ! -name "render.yaml" \
  ! -name "README.md" \
  ! -name "LICENSE" \
  ! -name "CNAME" \
  -exec cp -a {} "$output_dir"/ \;
