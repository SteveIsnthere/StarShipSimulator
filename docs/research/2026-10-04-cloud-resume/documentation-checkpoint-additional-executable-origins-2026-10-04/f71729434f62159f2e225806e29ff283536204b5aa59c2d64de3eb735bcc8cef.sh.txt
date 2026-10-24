#!/usr/bin/env bash
set -euo pipefail
activation_routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#activation_routes[@]} == 1 && -f "${activation_routes[0]}" ]] || { echo 'Expected exactly one versioned activation route' >&2; exit 69; }
source "${activation_routes[0]}"
cd /workspace/StarShipSimulator
research_dir=docs/research/2026-10-04-cloud-resume/comparator-public-assert-anchors
: "${STARSHIP_CPU_SLOT_GRANTED:?root must grant exclusive slot}"
: "${STARSHIP_CONTROL_LAUNCH_INPUT_SHA:?}"
: "${STARSHIP_CONTROL_LAUNCH_REVIEW_SHA:?}"
: "${STARSHIP_CONTROL_LAUNCH_REVIEW_PINS_SHA:?}"
export npm_execpath
npm_execpath=$(readlink -f "$(command -v npm)")
[[ -f "$npm_execpath" ]] || exit 69
outer_dir=$(mktemp -d "$research_dir/owned-launch-XXXXXXXX")
cp "$research_dir/launcher.mjs.txt" "$outer_dir/launcher.mjs"
cp "$research_dir/owned-command.mjs.txt" "$outer_dir/owned-command.mjs"
set +e
node "$outer_dir/launcher.mjs"
node_status=$?
set -e
printf '%s\n' "$node_status" > "$outer_dir/node-status.txt"
exit "$node_status"
