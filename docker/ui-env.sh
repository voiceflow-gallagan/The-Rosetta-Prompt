#!/bin/sh
set -eu

# This file is executed by the nginx official image on container startup.
# It generates a runtime-configurable env.js consumed by the React app.

API_BASE="${UI_API_BASE:-/api}"

cat > /usr/share/nginx/html/env.js <<EOF
// Generated at container start. Override via UI_API_BASE env var.
window.__ROSETTA_PROMPT__ = window.__ROSETTA_PROMPT__ || {};
window.__ROSETTA_PROMPT__.API_BASE = "${API_BASE}";
EOF


