#!/usr/bin/env bash
set -euo pipefail

# kill allchild processes on exit
trap 'trap - SIGTERM && kill -- -$$' SIGINT SIGTERM EXIT

# iterate over all arguments of the script, with an index
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
  path=${args[i]}
  (cd "$path" && npx projen watch) &
  pids[i]=$!
done

for pid in "${pids[@]}"; do
  wait "$pid"
done
