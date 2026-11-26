#!/usr/bin/env sh
set -eu

# Build a clean, public-only artifact for secondary static hosts.
# Usage: sh scripts/build-hosting-output.sh <output-directory>
output_dir="${1:?Usage: build-hosting-output.sh <output-directory>}"

case "$output_dir" in
  ""|"/"|"."|".." )
    echo "Refusing unsafe output directory: $output_dir" >&2
    exit 1
    ;;
esac

rm -rf "$output_dir"
mkdir -p "$output_dir"

# Copy the website tree, excluding repository metadata, developer notes,
# build/test tooling, credentials/config files, and non-site archives.
find . -mindepth 1 -maxdepth 1 \
  ! -name "$output_dir" \
  ! -name ".git" \
  ! -name ".github" \
  ! -name ".gitignore" \
  ! -name ".env*" \
  ! -name "node_modules" \
  ! -name "tests" \
  ! -name "scripts" \
  ! -name ".gitlab-ci.yml" \
  ! -name "render.yaml" \
  ! -name "README.md" \
  ! -name "TODO.md" \
  ! -name "LICENSE" \
  ! -name "CNAME" \
  ! -name "*.zip" \
  ! -name "*.log" \
  -exec cp -a {} "$output_dir"/ \;
