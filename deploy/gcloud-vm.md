# Deploy SkyOffice on a Google Compute Engine VM

This deployment uses Docker Compose:

- MongoDB stores Colyseus room listings in a Docker volume.
- The Colyseus server listens inside the Docker network on port `2567`.
- A frontend build container writes the React app into a shared volume.
- A separate Caddy container serves the frontend and automatically provisions HTTPS certificates.
- The browser connects to the backend through the same HTTPS host by default.

## 1. Create the VM

Use an Ubuntu VM with Docker and the Docker Compose plugin installed. Open inbound TCP ports `80` and `443` in the VM firewall or the VPC firewall.

Reserve a static external IP for the VM if this will be a permanent deployment.

## 2. Point DNS at the VM

Create both DNS `A` records pointing to the VM external IP:

```text
meet.guix.tech    -> VM_EXTERNAL_IP
office.guix.tech  -> VM_EXTERNAL_IP
```

Wait for DNS propagation before starting Caddy. Caddy needs working DNS and open ports `80`/`443` to issue certificates.

## 3. Clone and configure

```bash
git clone <your-repo-url> SkyOffice
cd SkyOffice
cp deploy/gcloud.env.example .env
nano .env
```

Set these values in `.env`:

```env
SITE_ADDRESS=meet.guix.tech
BACKEND_SITE_ADDRESS=office.guix.tech
VITE_SERVER_URL=wss://office.guix.tech
```

Keep `DOCKER_MONGODB_URI=mongodb://mongodb:27017/skyoffice` for Docker Compose.

## 4. Build and start

```bash
docker compose up -d --build
```

Check status and logs:

```bash
docker compose ps
docker compose logs -f frontend caddy server mongodb
```

Open:

```text
https://meet.guix.tech
```

The backend monitor is available at:

```text
https://office.guix.tech/colyseus/
```

## Common Operations

Deploy new code after pulling changes:

```bash
git pull
docker compose up -d --build --remove-orphans
```

For the shorter redeploy runbook, see [redeploy-gcloud.md](redeploy-gcloud.md).

Restart services:

```bash
docker compose restart
```

Stop services:

```bash
docker compose down
```

Stop services and delete MongoDB/Caddy volumes:

```bash
docker compose down -v
```

## Notes

- `VITE_SERVER_URL` is baked into the frontend image during `docker compose build`. If you change it, rebuild the client with `docker compose up -d --build --remove-orphans`.
- `VITE_SERVER_URL` is baked into the frontend build container during `docker compose build`. If you change it, rebuild with `docker compose up -d --build --remove-orphans`.
- Docker builds use BuildKit cache mounts for Yarn dependencies. Normal redeploys should be much faster after the first successful build.
- Client Docker builds default to `CLIENT_BUILD_COMMAND=build:fast`, which runs Vite bundling without the slower separate TypeScript check. Set `CLIENT_BUILD_COMMAND=build` in `.env` when you want Docker deployment to run `tsc` too.
- Do not commit `.env`; it is intentionally ignored by Git.
- If Caddy fails to obtain certificates, confirm DNS points to the VM and that cloud firewall rules allow inbound `80` and `443`.
