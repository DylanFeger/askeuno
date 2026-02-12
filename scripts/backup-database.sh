#!/bin/bash

# Automated Database Backup Script for Ask Euno
# This script creates daily backups of the PostgreSQL database
# and optionally uploads them to S3 for long-term storage

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="${DATABASE_URL}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"  # Optional S3 bucket for backups
S3_PREFIX="${S3_BACKUP_PREFIX:-euno-backups/}"  # S3 prefix/folder
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"  # Keep backups for 7 days locally
S3_RETENTION_DAYS="${S3_BACKUP_RETENTION_DAYS:-30}"  # Keep backups for 30 days in S3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Perform backup
log "Creating database dump..."
if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    error "Failed to create database backup"
    exit 1
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    log "Uploading backup to S3..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI is not installed. Skipping S3 upload."
    else
        S3_KEY="${S3_PREFIX}backup_$TIMESTAMP.sql.gz"
        
        if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_KEY"; then
            log "Backup uploaded to S3: s3://$S3_BUCKET/$S3_KEY"
            
            # Clean up old backups from S3 (older than retention period)
            log "Cleaning up old backups from S3 (older than $S3_RETENTION_DAYS days)..."
            aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" | while read -r line; do
                # Extract date from filename
                FILE_DATE=$(echo "$line" | awk '{print $1" "$2}')
                FILE_NAME=$(echo "$line" | awk '{print $4}')
                
                if [ -n "$FILE_NAME" ]; then
                    # Convert to epoch time for comparison
                    FILE_EPOCH=$(date -d "$FILE_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$FILE_DATE" +%s 2>/dev/null || echo "0")
                    CUTOFF_EPOCH=$(date -d "$S3_RETENTION_DAYS days ago" +%s 2>/dev/null || date -v-${S3_RETENTION_DAYS}d +%s 2>/dev/null || echo "0")
                    
                    if [ "$FILE_EPOCH" -lt "$CUTOFF_EPOCH" ]; then
                        log "Deleting old backup from S3: $FILE_NAME"
                        aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX$FILE_NAME"
                    fi
                fi
            done
        else
            error "Failed to upload backup to S3"
            # Don't exit - local backup is still available
        fi
    fi
else
    log "S3_BACKUP_BUCKET not configured. Skipping S3 upload."
fi

# Clean up old local backups
log "Cleaning up old local backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
log "Remaining local backups: $REMAINING"

log "Backup completed successfully!"

# Optional: Send notification (uncomment and configure if needed)
# if [ -n "$WEBHOOK_URL" ]; then
#     curl -X POST "$WEBHOOK_URL" \
#         -H "Content-Type: application/json" \
#         -d "{\"text\":\"Database backup completed: $BACKUP_FILE ($BACKUP_SIZE)\"}"
# fi
