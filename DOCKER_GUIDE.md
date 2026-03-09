# Docker Setup Guide

This guide explains how to run the PDF Template API using Docker and Docker Compose.

## Prerequisites

- **Docker Desktop** (for Windows): [Download here](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** (included with Docker Desktop)

## Quick Start

### 1. Start All Services

```bash
docker-compose up -d
```

This command will:
- Pull the PostgreSQL and pgAdmin images
- Build your FastAPI application image
- Start all services in the background

### 2. View Logs

```bash
# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# View database logs only
docker-compose logs -f db
```

### 3. Access the Services

- **API Documentation**: http://localhost:8000/docs
- **API ReDoc**: http://localhost:8000/redoc
- **API Health**: http://localhost:8000/health
- **pgAdmin** (Database UI): http://localhost:5050
  - Email: `admin@example.com`
  - Password: `admin`

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

## Database Connection

### Connecting to PostgreSQL from pgAdmin

1. Open pgAdmin at http://localhost:5050
2. Login with credentials (admin@example.com / admin)
3. Right-click "Servers" → "Register" → "Server"
4. **General Tab**: Name: `PDF Template DB`
5. **Connection Tab**:
   - Host: `db` (or `localhost` if connecting from host machine)
   - Port: `5432`
   - Database: `pdf_templates`
   - Username: `pdfuser`
   - Password: `pdfpassword`

### Connection String

From your **host machine**:
```
postgresql://pdfuser:pdfpassword@localhost:5432/pdf_templates
```

From **inside Docker network** (container to container):
```
postgresql://pdfuser:pdfpassword@db:5432/pdf_templates
```

## Development Workflow

### Hot Reload

The application is configured with hot reload enabled. Any changes to files in the `app/` directory will automatically restart the server.

### Running Commands Inside Containers

```bash
# Execute a command in the app container
docker-compose exec app python -m pytest

# Access the app container shell
docker-compose exec app bash

# Access the database container
docker-compose exec db psql -U pdfuser -d pdf_templates

# Run Alembic migrations
docker-compose exec app alembic upgrade head
```

### Database Migrations

```bash
# Create a new migration
docker-compose exec app alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec app alembic upgrade head

# Rollback migration
docker-compose exec app alembic downgrade -1
```

## Building and Rebuilding

### Rebuild After Dependency Changes

If you modify `requirements.txt`:

```bash
docker-compose build app
docker-compose up -d app
```

### Force Clean Rebuild

```bash
docker-compose build --no-cache app
docker-compose up -d app
```

## Production Deployment

For production, create a separate `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - APP_ENV=production
      - APP_DEBUG=False
    depends_on:
      - db
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app
docker-compose logs db

# Restart a specific service
docker-compose restart app
```

### Database Connection Issues

```bash
# Check if database is ready
docker-compose exec db pg_isready -U pdfuser

# Check database logs
docker-compose logs db

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Port Already in Use

If port 8000 or 5432 is already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Change host port
```

### Permission Issues (Linux/Mac)

```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

## Environment Variables

You can override environment variables by creating a `.env` file:

```env
# .env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydb
APP_ENV=development
APP_DEBUG=True
```

Then modify `docker-compose.yml` to use these:

```yaml
services:
  db:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
```

## Useful Commands

```bash
# View running containers
docker-compose ps

# View resource usage
docker stats

# Remove all stopped containers
docker-compose rm

# Pull latest images
docker-compose pull

# View networks
docker network ls

# View volumes
docker volume ls

# Backup database
docker-compose exec db pg_dump -U pdfuser pdf_templates > backup.sql

# Restore database
docker-compose exec -T db psql -U pdfuser pdf_templates < backup.sql
```

## Next Steps

1. **Set up CI/CD**: Automate building and pushing Docker images
2. **Use Docker Registry**: Push images to Docker Hub or private registry
3. **Orchestration**: Consider Kubernetes for production scaling
4. **Monitoring**: Add Prometheus and Grafana for monitoring
5. **Logging**: Set up ELK stack for centralized logging

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Docker Documentation](https://fastapi.tiangolo.com/deployment/docker/)
- [PostgreSQL Docker Documentation](https://hub.docker.com/_/postgres)
