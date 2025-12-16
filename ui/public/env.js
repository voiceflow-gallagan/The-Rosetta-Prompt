// Static fallback used by `npm start`.
// In Docker, this is overwritten at container start by `docker/ui-env.sh`.
window.__ROSETTA_PROMPT__ = window.__ROSETTA_PROMPT__ || {};
window.__ROSETTA_PROMPT__.API_BASE = window.__ROSETTA_PROMPT__.API_BASE || "http://localhost:8000";


