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

AUTH_USER="${UI_BASIC_AUTH_USER:-}"
AUTH_PASS="${UI_BASIC_AUTH_PASSWORD:-}"

AUTH_ENABLED=0
if [ -n "${AUTH_USER}" ] && [ -n "${AUTH_PASS}" ]; then
  AUTH_ENABLED=1
  # Create htpasswd file for nginx basic auth
  htpasswd -bc /etc/nginx/.htpasswd "${AUTH_USER}" "${AUTH_PASS}" >/dev/null 2>&1
fi

# Generate nginx config at runtime so Basic Auth can be enabled/disabled via env
if [ "${AUTH_ENABLED}" -eq 1 ]; then
  cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;
  client_max_body_size 10m;

  auth_basic "Restricted";
  auth_basic_user_file /etc/nginx/.htpasswd;

  # SPA routing
  location / {
    try_files $uri /index.html;
  }

  # Proxy API to the backend container (keeps UI same-origin)
  location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 30s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    proxy_buffering off;

    proxy_pass http://api:8000/;
  }
}
EOF
else
  cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;
  client_max_body_size 10m;

  # SPA routing
  location / {
    try_files $uri /index.html;
  }

  # Proxy API to the backend container (keeps UI same-origin)
  location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 30s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    proxy_buffering off;

    proxy_pass http://api:8000/;
  }
}
EOF
fi


