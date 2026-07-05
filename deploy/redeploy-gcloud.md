# Redeploy SkyOffice on Google Cloud VM

Use this when the VM already exists and DNS already points to it:

```text
meet.guix.tech    -> VM_EXTERNAL_IP
office.guix.tech  -> VM_EXTERNAL_IP
```

## Redeploy Latest Code

SSH into the VM, then run:

```bash
cd SkyOffice
git pull
docker compose up -d --build --remove-orphans
```

Check that all services are running:

```bash
docker compose ps
```

Watch logs if something does not load:

```bash
docker compose logs -f client server mongodb
```

Open:

```text
https://meet.guix.tech
```

Backend monitor:

```text
https://office.guix.tech/colyseus/
```

## First-Time VM Setup

If this is a fresh VM:

```bash
git clone <your-repo-url> SkyOffice
cd SkyOffice
cp deploy/gcloud.env.example .env
docker compose up -d --build
```

The `.env` file should contain:

```env
DOCKER_MONGODB_URI=mongodb://mongodb:27017/skyoffice
PORT=2567
SITE_ADDRESS=meet.guix.tech
BACKEND_SITE_ADDRESS=office.guix.tech
HTTP_PORT=80
HTTPS_PORT=443
VITE_SERVER_URL=wss://office.guix.tech
```

## VM Requirements

- Docker and Docker Compose plugin installed.
- Inbound TCP `80` and `443` allowed in Google Cloud firewall rules.
- DNS records for `meet.guix.tech` and `office.guix.tech` pointing to the VM external IP.
- Prefer a static external IP so DNS does not break after VM restarts.

## Useful Commands

Restart containers:

```bash
docker compose restart
```

Stop containers:

```bash
docker compose down
```

Rebuild from scratch without deleting MongoDB data:

```bash
docker compose build --no-cache
docker compose up -d
```

Fast cached rebuild without restarting containers:

```bash
docker compose build server client
```

Apply the newly built images:

```bash
docker compose up -d --remove-orphans
```

Remove old build cache if the VM disk gets full:

```bash
docker builder prune
```

Remove old stopped containers and unused images:

```bash
docker system prune
```

Delete all app containers and volumes, including MongoDB data and Caddy certificates:

```bash
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to reset stored room data and force Caddy to request certificates again.

## Troubleshooting

If HTTPS does not work, check DNS and firewall first:

```bash
docker compose logs -f client
```

If the client loads but cannot connect to rooms, confirm the frontend was built with:

```env
VITE_SERVER_URL=wss://office.guix.tech
```

Then rebuild:

```bash
docker compose up -d --build
```
