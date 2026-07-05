# Deploy JIDAAR QC / IR SaaS Online

This MVP can run online as one Docker container.

## Recommended First Deployment

Use a small VPS with Docker because the app currently uses:

- SQLite database in `/app/db`
- Generated Excel files in `/app/storage`

These folders must be persistent. Docker Compose below already creates persistent volumes.

## Option A: VPS + Docker Compose

1. Rent a small VPS.

Recommended minimum:

| Item | Value |
|---|---|
| CPU | 1 vCPU |
| RAM | 1 GB minimum, 2 GB better |
| Disk | 20 GB |
| OS | Ubuntu 22.04 or 24.04 |

2. Install Docker:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin unzip
sudo systemctl enable --now docker
```

3. Upload `qc-ir-saas.zip` to the VPS, then:

```bash
unzip qc-ir-saas.zip
cd qc-ir-saas
sudo docker compose up -d --build
```

4. Open:

```text
http://SERVER_IP:8080
```

5. Login:

| Username | Password |
|---|---|
| admin | admin123 |
| arch | 123456 |
| qc | 123456 |
| dc | 123456 |

## Option B: Render / Railway / Fly.io

Create a new Docker web service from this folder.

Important:

- Set the web port to `8080` or use the platform `PORT` env variable.
- Add persistent storage/disk mounted to:
  - `/app/db`
  - `/app/storage`

Without persistent storage, records and generated Excel files may disappear after redeploy.

For Railway-specific steps, see `RAILWAY.md`.

## Production Upgrade Needed

Before using this for real project records, upgrade:

| MVP | Production |
|---|---|
| SQLite | PostgreSQL |
| Local storage | S3 / Azure Blob / server volume |
| Demo passwords | bcrypt/argon2 + password reset |
| HTTP | HTTPS + domain |
| Basic roles | Full admin user management |
| Manual email status | SMTP / Outlook integration |

## Domain Example

After the server works on:

```text
http://SERVER_IP:8080
```

connect a domain like:

```text
https://qc-ir.jidaar.com
```

using Nginx reverse proxy + SSL.
