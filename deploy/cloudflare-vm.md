# Deploy SkyOffice With Cloudflare Tunnel

This is the simpler production path:

- Docker runs MongoDB, the backend server, the frontend server, and `cloudflared`.
- The frontend image and backend image have separate Dockerfiles.
- The frontend container serves only the built app.
- Cloudflare Tunnel routes public hostnames directly to the frontend and backend containers.
- Cloudflare owns public DNS and HTTPS.
- The VM does not need public inbound `80` or `443`.

## 1. Create The Tunnel

In Cloudflare Zero Trust, create a tunnel for this app and add two public hostnames:

```text
meet.guix.tech   -> http://frontend:80
office.guix.tech -> http://server:2567
```

Copy the tunnel token. That token is the only Cloudflare secret Docker needs.

## 2. Configure The VM

```bash
git clone <your-repo-url> SkyOffice
cd SkyOffice
cp deploy/cloudflare.env.example .env
nano .env
```

Set:

```env
CLOUDFLARE_TUNNEL_TOKEN=<your tunnel token>
VITE_SERVER_URL=wss://office.guix.tech
```

## 3. Build And Start

```bash
docker compose --profile cloudflare up -d --build --remove-orphans
```

Check status and logs:

```bash
docker compose --profile cloudflare ps
docker compose logs -f cloudflared frontend server mongodb
```

Open:

```text
https://meet.guix.tech
```

The backend monitor is available through the backend hostname:

```text
https://office.guix.tech/colyseus/
```

## Redeploy

```bash
git pull
docker compose --profile cloudflare up -d --build --remove-orphans
```

If Cloudflare connects but rooms fail to join, confirm `VITE_SERVER_URL` points to the backend hostname and rebuild the frontend image.
