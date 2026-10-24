#!/usr/bin/env bash

audit_caller_flags=$-
audit_caller_bashopts=$BASHOPTS
builtin set +x

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  builtin printf '%s\n' 'Refusing child-Bash launch; source this wrapper in the activated workspace shell.' >&2
  builtin exit 78
fi

builtin set -Eeuo pipefail

if [[ "$audit_caller_flags" != hBc ]]; then
  builtin printf '%s\n' 'Refusing caller shell with flags that differ from the pinned non-interactive startup shell.' >&2
  builtin return 78
fi

if [[ "$audit_caller_bashopts" != 'checkwinsize:cmdhist:complete_fullquote:extquote:force_fignore:globasciiranges:globskipdots:hostcomplete:interactive_comments:patsub_replacement:progcomp:promptvars:sourcepath' ]]; then
  builtin printf '%s\n' 'Refusing caller shell with BASHOPTS that differ from the pinned activation state.' >&2
  builtin return 78
fi

if [[ "$BASHOPTS" == *expand_aliases* ]]; then
  builtin printf '%s\n' 'Refusing caller shell with alias expansion enabled.' >&2
  builtin return 78
fi

if [[ -n "$(builtin trap -p)" ]]; then
  builtin printf '%s\n' 'Refusing caller shell with inherited traps.' >&2
  builtin return 78
fi

if [[ -n "$(builtin declare -F)" ]]; then
  builtin printf '%s\n' 'Refusing caller shell with inherited functions.' >&2
  builtin return 78
fi

if [[ -n "$(builtin alias -p)" ]]; then
  builtin printf '%s\n' 'Refusing caller shell with inherited aliases.' >&2
  builtin return 78
fi

if [[ ${BASH_ENV+x} || ${ENV+x} ]]; then
  builtin printf '%s\n' 'Refusing a workspace shell with Bash startup hooks.' >&2
  builtin return 78
fi

safe_names=(
  HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY
  http_proxy https_proxy all_proxy no_proxy
  SSL_CERT_FILE SSL_CERT_DIR NODE_EXTRA_CA_CERTS
)
safe_values=()
for name in "${safe_names[@]}"; do
  if [[ -v "$name" ]]; then safe_values+=("$name=${!name}"); fi
done

cleared_controls=()
exported_names=$(builtin compgen -e)
while IFS= read -r name; do
  case "$name" in
    LD_*|GLIBC_TUNABLES|NODE_OPTIONS|NODE_PATH|NODE_V8_COVERAGE|NPM_CONFIG_*|npm_config_*|NATIVE_FLIGHT_*|VITEST_*)
      cleared_controls+=("$name")
      ;;
  esac
  builtin unset "$name"
done <<< "$exported_names"
builtin unset exported_names

export PATH=/workspace/cloud-bootstrap/starship-v1/node/bin:/usr/local/bin:/usr/bin:/bin
export PLAYWRIGHT_BROWSERS_PATH=/workspace/cloud-bootstrap/starship-v1/browsers
export XDG_CACHE_HOME=/workspace/cloud-bootstrap/starship-v1/cache
export HOME=/workspace/cloud-bootstrap/starship-v1/empty-home
export TZ=Etc/UTC
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null
export GIT_CONFIG_NOSYSTEM=1
for value in "${safe_values[@]}"; do builtin export "$value"; done
export STARSHIP_SCENARIO_AUDIT_LAUNCHER_MODE=source-existing-shell-pinned-clean-state-v2
control_names_csv=''
for name in "${cleared_controls[@]}"; do
  if [[ -n "$control_names_csv" ]]; then control_names_csv+=,; fi
  control_names_csv+="$name"
done
export STARSHIP_SCENARIO_AUDIT_CLEARED_CONTROL_NAMES="$control_names_csv"

packet_dir=/workspace/StarShipSimulator/docs/research/2026-10-13-phase8-scenario-matrix-v22/flight-audit-packet
expected_packet_pins_sha256=a2b2cabbc843790223b8843ffdf157adf1930eb42d389ae4c24f750d40457b3c
if ! builtin cd /workspace/StarShipSimulator; then
  builtin printf '%s\n' 'Refusing to run outside the pinned workspace.' >&2
  builtin return 78
fi
packet_pins_line=$(/usr/bin/sha256sum "$packet_dir/packet-pins.sha256")
actual_packet_pins_sha256=${packet_pins_line%% *}
if [[ "$actual_packet_pins_sha256" != "$expected_packet_pins_sha256" ]]; then
  builtin printf '%s\n' 'Refusing a packet sidecar whose digest differs from this reviewed launcher.' >&2
  builtin return 78
fi
/usr/bin/sha256sum -c "$packet_dir/packet-pins.sha256" > /dev/null
export STARSHIP_SCENARIO_AUDIT_PACKET_SHA256="$expected_packet_pins_sha256"

builtin exec /workspace/cloud-bootstrap/starship-v1/node/bin/node \
  /workspace/StarShipSimulator/docs/research/2026-10-13-phase8-scenario-matrix-v22/flight-audit-packet/owned-runner.mjs
