# Confidential Marketplace — Status

**Last Updated:** 2026-04-16 12:08 UTC

---

## Current State

### 🚀 Application
- **Running:** YES
- **Port:** 3000
- **URL:** http://localhost:3000
- **Start Command:** `cd /root/.openclaw/workspace/confidential && PORT=3000 node src/server.js`

### 🌐 Cloudflare Tunnel
- **Tunnel Name:** jobs-sativa (newly created)
- **Token:** (active)
- **Status:** Connected to 4 Cloudflare edges (phx01, lax05 x2)
- **Service Config:** http://localhost:3000
- **Ingress:** jobs.sativaexchange.com → localhost:3000

### 📡 DNS Status
- **jobs.sativaexchange.com:** Not resolving yet
- **Reason:** Nameserver update in progress (24-48 hours)
- **Target:** Once DNS propagates, should point to jobs-sativa.cfdtunnel.com

---

## Session Notes (2026-04-16)

### 12:08 UTC — Status File Created
- Created this status.md to track project state
- Application confirmed running on port 3000
- Tunnel connected and configured correctly
- Waiting on DNS propagation

### 11:54 UTC — Tunnel Restarted
- Created new tunnel after old one had config issues
- Token: eyJhIjoiYjE2ZTMxMzZlYzkxNzRlMDBkOTQ2NjM2NTAyZGJlOWYiLCJ0IjoiNmI4NjU2MWYtN2MzNy00YjNkLWFjMDctMjI3MzU3Mjc4OTIxIiwicyI6Ik5EbGxOamRqWVRVdE5tTm1NQzAwTWpnMExUZ3pZemd0TlRNM016SmxNamM1TnpJNCJ9
- Configured to route jobs.sativaexchange.com → localhost:3000
- App started: cd /root/.openclaw/workspace/confidential && PORT=3000 node src/server.js

### 11:52 UTC — Old Tunnel Deleted
- Previous tunnel had wrong ingress config (routing sativaexchange.com instead of jobs.sativaexchange.com)
- Arnel deleted old tunnel, created new one

### 11:33-11:41 UTC — Tunnel Troubleshooting
- Multiple attempts to get tunnel working
- Ingress config issues — Cloudflare pushing old config
- Eventually decided to create new tunnel

### 11:18 UTC — Token Update
- Arnel provided new token: eyJhIjoiYjE2ZTMxMzZlYzkxNzRlMDBkOTQ2NjM2NTAyZGJlOWYiLCJ0IjoiODRjYjI3MmUtZWRmYi00OGIyLWFhNTQtNDVmMTRiZjlmYTQwIiwicyI6Ik9HWmhNekJpTkRNdFpESTBNaTAwTmpobUxXRXhObVF0WldRNE5XUXhOR1k1T1RreiJ9
- Cloudflared service reinstalled

### Earlier — Initial Setup
- Cloudflare tunnel setup for jobs.sativaexchange.com
- Original intent: route traffic to Confidential Marketplace app
- App runs on port 3000 in /root/.openclaw/workspace/confidential

---

## Action Items

- [ ] Check DNS resolution periodically (jobs.sativaexchange.com)
- [ ] Once DNS works, verify app is accessible at https://jobs.sativaexchange.com

---

## Project Context

The Confidential Marketplace is an "agent-to-agent" platform where AI agents can post and complete tasks. It's part of the SativaExchange ecosystem.

**Related Projects:**
- SativaExchange.com (main site)
- Kevlar Data (new)
- RinkStop (hockey)
- Top Shelf Toker (cannabis)

---

## Notes for Future Sessions

When starting work on this project:
1. Check this status.md file first
2. Check if tunnel is running: `pgrep -a cloudflared`
3. Check if app is running: `pgrep -a node`
4. Test locally: `curl http://localhost:3000`
5. Check DNS: `curl -I https://jobs.sativaexchange.com`