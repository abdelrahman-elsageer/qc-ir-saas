# JIDAAR QC / IR SaaS MVP

Local SaaS-style MVP for the QC to IR workflow.

## Run

```bash
python3 backend/app.py
```

Open:

```text
http://localhost:8080
```

## Run With Docker

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:8080
```

For online deployment, see `DEPLOYMENT.md`.

## Demo Users

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin |
| arch | 123456 | Engineer |
| qc | 123456 | QC |
| dc | 123456 | Document Controller |
| manager | 123456 | Manager |

## What Works Now

- Role-based login.
- Submit QC requests.
- Prevent duplicate active submissions for the same building/floor/flat/part/BOQ/stage.
- Multiple users can submit concurrently; serials are generated inside a database transaction.
- Auto-generate QC Excel form from `templates/qc_template.xlsx`.
- QC approve/reject.
- Auto-generate IR record and IR Excel form after QC approval.
- Record IR consultant reply.
- Offline queue for submit/approve/reject operations, synced when connection returns.
- PWA shell caching for offline screen access.

## Important MVP Notes

- Email sending is represented by pending statuses; actual SMTP/Outlook integration is the next layer.
- Offline approval works for records already loaded on the device before internet loss.
- File upload UI is not included yet; generated forms are stored under `storage/generated`.
- Passwords are demo-hashed with SHA-256. Production should use bcrypt/argon2 and HTTPS.

## Reset Local Demo Data

Stop the server, then run:

```bash
python3 - <<'PY'
from pathlib import Path
for path in [Path('db/qc_ir.sqlite3')]:
    if path.exists():
        path.unlink()
for path in Path('storage/generated').glob('*.xlsx'):
    path.unlink()
PY
```

The next run will recreate a clean database with the demo users and seed data.
