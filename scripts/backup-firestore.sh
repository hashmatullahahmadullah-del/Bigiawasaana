#!/bin/bash
# Backup Firestore to a Cloud Storage bucket
# Usage: ./scripts/backup-firestore.sh
# 
# Example cron schedule to run this every day at 2:00 AM:
# 0 2 * * * /path/to/project/scripts/backup-firestore.sh >> /var/log/firestore-backup.log 2>&1

PROJECT_ID="bigi-awasaana-7b3ce"
# Replace with your actual GCS bucket name for backups
BUCKET_NAME="gs://bigi-awasaana-7b3ce-backups"

# Create a timestamp for the backup name
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_PATH="${BUCKET_NAME}/firestore_backup_${TIMESTAMP}"

echo "Starting Firestore backup for project: ${PROJECT_ID}"
echo "Destination: ${BACKUP_PATH}"

# Run the export command
gcloud firestore export ${BACKUP_PATH} --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo "Backup completed successfully!"
else
  echo "Backup failed!"
  exit 1
fi
