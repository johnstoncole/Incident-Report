# Tacoma Creek Fire — Great Basin IMT7 Medical Group IMS

A static dashboard for tracking medical resources, roster, and assignments
for the Great Basin IMT7 Medical Group on the Tacoma Creek Fire incident.

## Pages

- `index.html` — Incident dashboard
- `roster.html` — Personnel roster
- `tracking.html` — Tracking chart
- `add-resource.html` — Add a new resource

## Running locally

This is a plain static site — no build step. Serve it with any static
file server, for example:

```bash
python3 -m http.server 8743
```

Then open <http://localhost:8743>.

## Hosting

Published via GitHub Pages from the `main` branch.
