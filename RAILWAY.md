# Railway Deployment

Railway can deploy this app using the included `Dockerfile`.

## Important

This MVP stores:

- SQLite database
- Generated QC/IR Excel files

So you must add a Railway Volume. Railway apps are built in `/app`, and persistent volume mount paths should include `/app` for relative app data.

## Steps

1. Create a Railway account.

2. Create a new project.

3. Deploy this app:

   - Best: upload the project to GitHub, then connect the GitHub repo to Railway.
   - Alternative: use Railway CLI and run `railway up` from this folder.

4. Railway should detect the `Dockerfile`.

5. Add a Volume to the service.

   Use this mount path:

   ```text
   /app/data
   ```

   The app detects Railway's volume mount automatically through `RAILWAY_VOLUME_MOUNT_PATH`.

6. Set service variable:

   ```text
   PORT=8080
   ```

   Railway provides a `PORT` variable for services, and the app already reads it.

7. Deploy.

8. Open the Railway public domain.

9. Login:

| Username | Password |
|---|---|
| admin | admin123 |
| arch | 123456 |
| qc | 123456 |
| dc | 123456 |

## If You See Application Failed to Respond

Check:

- The app logs include: `QC/IR SaaS running at http://localhost:...`
- The service has a public domain.
- The app listens on `0.0.0.0` and the Railway `PORT`; this app already does.

## Data Persistence

With the volume mounted to `/app/data`, the app saves data at:

```text
/app/data/db/qc_ir.sqlite3
/app/data/storage/generated
/app/data/storage/uploads
```

Do not delete the Railway volume unless you want to delete all records and generated forms.
