# Deploying BetterYou

**Production runs on Railway** (section A). A single VPS such as Hostinger
works too (section B) with the same Docker images.

## A. Railway (live)

Project `betteryou`, environment `production`. Pushing to `main`
redeploys the three app services automatically (Railway GitHub app on
`PirateX-746/BetterYouApp`). Workflow: work on `DEV`, merge to `main`.

```
browser ──https──► gateway (Caddy) ─┬─ /api  /socket.io  /sse ─► backend :3002 ─► MongoDB (private)
  *.up.railway.app or custom domain └─ everything else ────────► frontend :3000
```

| Service | Root directory | Notes |
|---|---|---|
| `gateway` | `/deploy/railway-gateway` | The only public domain (port 8080). One domain keeps the session cookie working for WebSocket and SSE |
| `backend` | `/backend` | Healthcheck `/health` |
| `frontend` | `/frontend` | `HOSTNAME=::` so it listens on Railway's IPv6 private network |
| `MongoDB` | — | `mongo:8.0`, private network only; uploaded documents live here (GridFS) |

**Variables** (Railway → service → Variables; never in git):

- backend: `MONGO_URI=${{MongoDB.MONGO_URL}}/betteryou?authSource=admin`,
  `JWT_SECRET`, `APPOINTMENT_LINK_SECRET`, `PASSWORD_ENCRYPTION_KEY`,
  `NODE_ENV=production`, `PORT=3002`, `TRUST_PROXY=2` (Railway edge + gateway),
  `FRONTEND_URL=https://${{gateway.RAILWAY_PUBLIC_DOMAIN}}`,
  `MULTI_TENANCY_ENABLED=false`, `RESEND_API_KEY`, `EMAIL_FROM`
- frontend: `PORT=3000`, `HOSTNAME=::`, `NEXT_PUBLIC_API_URL=/api`,
  `NEXT_PUBLIC_SOCKET_URL=` (empty = same origin),
  `NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY=${{backend.PASSWORD_ENCRYPTION_KEY}}`,
  `BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:3002`.
  `NEXT_PUBLIC_*` are baked in at build time: redeploy the frontend after changing them
- gateway: `PORT=8080`, `BACKEND_HOST=${{backend.RAILWAY_PRIVATE_DOMAIN}}:3002`,
  `FRONTEND_HOST=${{frontend.RAILWAY_PRIVATE_DOMAIN}}:3000`

**Email:** Railway's Hobby plan blocks SMTP, so production uses Resend.
`EMAIL_FROM` must be on a domain verified in Resend; until then Resend
delivers only to the account owner's address.

**Custom domain:** add it to the **gateway** service (Settings → Networking),
create the CNAME it shows, then redeploy the backend so `FRONTEND_URL`
picks it up (it references the gateway's public domain).

**One-off commands** (e.g. creating the first admin) run inside the backend
container over `railway ssh --service backend` once an SSH key is registered
(`railway ssh keys add`):

```bash
node dist/migrations/002-seed-platform-admin.js --with-practice
# with PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD (12+ chars), SEED_PRACTICE_NAME set
```

**Gotcha:** if the gateway starts before the other services exist it logs
`dial tcp :3002: connection refused` (empty private domain). Redeploy the
gateway.

---

## B. Single VPS (Hostinger or similar)

One VPS runs the whole app in Docker: the Next.js frontend, the NestJS API,
and Caddy in front for HTTPS. The database is MongoDB Atlas; email goes
through any SMTP mailbox (Hostinger Email) or Resend.

```
browser ──https──► Caddy (VPS :443) ─┬─ /api  /socket.io  /sse ─► backend :3002 ─► MongoDB Atlas
                                     └─ everything else ────────► frontend :3000      SMTP / Resend
```

Everything is served from **one domain** (e.g. `app.yourclinic.com`). That is
deliberate: the session cookie the API sets must also reach WebSocket and
SSE connections, which only works on one host.

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Frontend + backend | **Hostinger VPS** (KVM 2 or bigger, Ubuntu 24.04 with Docker) | Shared/"Web" hosting is not suitable: the API needs long-lived WebSockets and a background reminder job |
| Database | **MongoDB Atlas**, a NEW cluster just for production | Hostinger has no managed MongoDB. Never point production at the dev database |
| Email | **Hostinger Email** mailbox over SMTP, or **Resend** | Hostinger: `smtp.hostinger.com:465`, and `EMAIL_FROM` must be that same mailbox |
| Document files | **MongoDB GridFS** (default) or **Cloudflare R2** | Hostinger has no S3-style bucket. GridFS needs no setup; R2 when files outgrow the DB plan |

## 1. Accounts and DNS (about 20 min)

1. **VPS:** in hPanel → VPS, pick the OS template **Ubuntu 24.04 with Docker**.
   Note the server IP and set an SSH key or root password.
2. **DNS:** in the domain's DNS zone add an **A record** `app` → the VPS IP
   (or `@` for the bare domain). Wait until `ping app.yourclinic.com` shows the IP.
3. **MongoDB Atlas:** create a cluster, then a database user. In *Network
   Access*, add the **VPS IP** only (not 0.0.0.0/0). Copy the connection
   string with a database name, e.g. `.../betteryou?retryWrites=true`. Turn
   on backups (M10 or larger has continuous backups; the free M0 has none
   and only 512 MB).
4. **Email mailbox:** in hPanel → Emails, create e.g.
   `appointments@yourclinic.com`. Also add the SPF/DKIM/DMARC records hPanel
   shows, or messages land in spam.

## 2. Server setup (about 15 min)

```bash
ssh root@<VPS-IP>
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
git clone <your repo URL> betteryou && cd betteryou
git checkout main
```

Create **`backend/.env.production`** (never commit it):

```bash
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/betteryou?retryWrites=true&w=majority
JWT_SECRET=<openssl rand -hex 32>
APPOINTMENT_LINK_SECRET=<openssl rand -hex 32>
PASSWORD_ENCRYPTION_KEY=<openssl rand -hex 32>   # or leave unset here AND in deploy/.env

MULTI_TENANCY_ENABLED=false
ROOT_DOMAIN=yourclinic.com

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=appointments@yourclinic.com
SMTP_PASS=<mailbox password>
EMAIL_FROM=BetterYou <appointments@yourclinic.com>
# or instead: RESEND_API_KEY=re_...  and EMAIL_FROM on a Resend-verified domain
```

`NODE_ENV`, `PORT`, `TRUST_PROXY` and `FRONTEND_URL` are set by
`deploy/docker-compose.yml`. Do **not** set `ALLOW_DEV_PASSWORD_RESET_ECHO`.

Create **`deploy/.env`**:

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env    # DOMAIN=app.yourclinic.com, PASSWORD_ENCRYPTION_KEY=<same as above>
```

## 3. Start it (about 10 min, the first build is the slow part)

```bash
cd deploy
docker compose up -d --build
docker compose ps                   # backend should become "healthy"
docker compose logs -f backend      # look for "Email provider: smtp" and no errors
```

Caddy gets the HTTPS certificate on the first request to the domain.

## 4. First accounts (production DB starts empty)

```bash
docker compose exec \
  -e PLATFORM_ADMIN_EMAIL=admin@yourclinic.com \
  -e PLATFORM_ADMIN_PASSWORD='<12+ characters>' \
  -e SEED_PRACTICE_NAME='Your Clinic Name' \
  backend node dist/migrations/002-seed-platform-admin.js --with-practice
```

Then sign in at `https://app.yourclinic.com/adminLogin`, open the practice,
set its timezone, hours, phone and email, and invite the practitioners. The
invite link is shown in the console, so send it to them yourself.

## 5. Smoke test (about 10 min)

- [ ] `https://app.yourclinic.com/api/health` → `{"status":"ok","db":"up"}`
- [ ] Padlock shows a valid certificate; `http://` redirects to `https://`
- [ ] Practitioner signs in, sees the dashboard, then signs out and back in
- [ ] Chat between two accounts updates live (WebSocket + SSE)
- [ ] Book an appointment for a test patient with **your own** email → booked email arrives
- [ ] Reschedule it → rescheduled email; cancel it → cancelled email
- [ ] Book one 5–20 h ahead → the email has **Confirm** / **Cancel** buttons, and they work from a phone
- [ ] Upload and open a document
- [ ] `https://app.yourclinic.com/does-not-exist` shows the branded 404

## Updating

```bash
cd ~/betteryou && git pull && cd deploy && docker compose up -d --build
```

The API shuts down gracefully, so in-flight requests finish. Expect a
few seconds of downtime while the containers swap.

**Rollback:** `git checkout <previous commit> && docker compose up -d --build`.

## Operations

- **Logs:** `docker compose logs --tail=200 backend` (also `frontend`, `caddy`)
- **Uptime:** point a free monitor (UptimeRobot, Better Stack) at `/api/health`
- **Backups:** Atlas backups cover the database *and* the GridFS documents.
  Do a test restore before patients rely on it
- **Scale:** run ONE backend container. Rate limits live in memory; the
  reminder job is safe with more, but the limits are not

## Before real patients (not code: needs the clinic)

- Privacy policy and terms pages: the clinic's legal entity, contact and
  data-protection officer must be in them, so they come from the clinic
  or its lawyer, not from the code
- Data-processing agreements with MongoDB Atlas, Hostinger and the email
  provider (India DPDP Act; HIPAA BAAs if US patients)
