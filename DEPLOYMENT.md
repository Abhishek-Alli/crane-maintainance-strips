# Deployment Guide

## Quick Start for Production Deployment

### Prerequisites
- Ubuntu 20.04+ / CentOS 8+ / Windows Server
- Node.js v16+ installed
- PostgreSQL v13+ installed
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

---

## Method 1: Manual Deployment (Linux/Ubuntu)

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE crane_maintenance;
CREATE USER crane_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crane_maintenance TO crane_user;
\q

# Run schema
psql -U crane_user -d crane_maintenance -f database-schema.sql
```

### Step 3: Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/crane-maintenance
sudo chown $USER:$USER /var/www/crane-maintenance

# Copy application files
cp -r . /var/www/crane-maintenance/

# Navigate to backend
cd /var/www/crane-maintenance/backend

# Install dependencies
npm install --production

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=crane_user
DB_PASSWORD=your_secure_password
PORT=5000
NODE_ENV=production
GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
CORS_ORIGIN=https://yourdomain.com
EOF

# Place Google credentials
mkdir -p config
# Upload your google-credentials.json to backend/config/

# Start backend with PM2
pm2 start server.js --name crane-api
pm2 save
pm2 startup
```

### Step 4: Frontend Build

```bash
cd /var/www/crane-maintenance/frontend

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=https://api.yourdomain.com/api
EOF

# Install dependencies and build
npm install
npm run build
```

### Step 5: nginx Configuration

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/crane-maintenance
```

Paste this configuration:

```nginx
# API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/crane-maintenance/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/crane-maintenance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

---

## Method 2: Docker Deployment

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crane_maintenance
      POSTGRES_USER: crane_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    networks:
      - crane-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: crane_maintenance
      DB_USER: crane_user
      DB_PASSWORD: your_secure_password
      PORT: 5000
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - postgres
    volumes:
      - ./backend/config:/app/config
    networks:
      - crane-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - crane-network

networks:
  crane-network:
    driver: bridge

volumes:
  postgres-data:
```

### Create backend/Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Create frontend/Dockerfile

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Method 3: Cloud Platform Deployment

### AWS Deployment

**Services Used:**
- RDS (PostgreSQL)
- EC2 (Backend)
- S3 + CloudFront (Frontend)
- Route 53 (DNS)

**Steps:**

1. **Create RDS Instance**
   - PostgreSQL 15
   - db.t3.micro (or larger)
   - Enable backups
   - Note endpoint URL

2. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.micro or larger
   - Configure security groups (allow 22, 80, 443)

3. **Deploy Backend to EC2**
   - SSH into instance
   - Follow "Manual Deployment" steps above
   - Update .env with RDS endpoint

4. **Deploy Frontend to S3**
   ```bash
   # Build frontend
   npm run build

   # Upload to S3
   aws s3 sync build/ s3://your-bucket-name --delete

   # Configure S3 for static website hosting
   # Create CloudFront distribution
   ```

5. **Configure Route 53**
   - Point domain to CloudFront (frontend)
   - Point api subdomain to EC2 (backend)

### Google Cloud Platform

**Services Used:**
- Cloud SQL (PostgreSQL)
- Compute Engine (Backend)
- Cloud Storage + CDN (Frontend)

**Steps:**

1. **Create Cloud SQL Instance**
   ```bash
   gcloud sql instances create crane-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Deploy Backend to Compute Engine**
   ```bash
   # Create VM
   gcloud compute instances create crane-backend \
     --machine-type=e2-micro \
     --image-family=ubuntu-2204-lts \
     --image-project=ubuntu-os-cloud

   # SSH and deploy
   gcloud compute ssh crane-backend
   # Follow manual deployment steps
   ```

3. **Deploy Frontend to Cloud Storage**
   ```bash
   # Create bucket
   gsutil mb gs://crane-maintenance

   # Upload build
   gsutil -m rsync -r build/ gs://crane-maintenance

   # Make public
   gsutil iam ch allUsers:objectViewer gs://crane-maintenance
   ```

---

## Windows Server Deployment

### Step 1: Install Prerequisites

1. **Install Node.js**
   - Download from nodejs.org
   - Install LTS version

2. **Install PostgreSQL**
   - Download from postgresql.org
   - Use installer, note password

3. **Install IIS (Optional)**
   - For hosting frontend
   - Or use nginx for Windows

### Step 2: Setup Backend

```powershell
# Navigate to backend
cd C:\crane-maintenance\backend

# Install dependencies
npm install --production

# Create .env file
@"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=postgres
DB_PASSWORD=your_password
PORT=5000
NODE_ENV=production
GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
CORS_ORIGIN=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8

# Install pm2-windows
npm install -g pm2-windows

# Start backend
pm2 start server.js --name crane-api
pm2 save
```

### Step 3: Setup Frontend

```powershell
cd C:\crane-maintenance\frontend

# Build
npm run build

# Copy build folder to IIS wwwroot
# Or serve with nginx
```

### Step 4: Windows Service (Alternative to PM2)

Use node-windows to create Windows service:

```javascript
// service.js
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Crane Maintenance API',
  description: 'Backend API for Crane Maintenance System',
  script: 'C:\\crane-maintenance\\backend\\server.js'
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

---

## Post-Deployment Checklist

### Security

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up fail2ban (Linux)
- [ ] Regular security updates
- [ ] Restrict database access
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for trusted domains

### Monitoring

- [ ] Set up application logging
- [ ] Configure error alerting
- [ ] Monitor disk space
- [ ] Monitor database performance
- [ ] Set up uptime monitoring
- [ ] Configure backup alerts

### Backups

- [ ] Database automated backups (daily)
- [ ] Application code backups
- [ ] Google credentials backup
- [ ] Document restoration procedure
- [ ] Test backup restoration

### Performance

- [ ] Enable gzip compression
- [ ] Configure caching headers
- [ ] Set up CDN (optional)
- [ ] Database query optimization
- [ ] Monitor response times

---

## Scaling Considerations

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Upgrade database instance
- Add read replicas

### Horizontal Scaling
- Load balancer (nginx, HAProxy)
- Multiple backend instances
- Session management (Redis)
- Database connection pooling

### Caching
- Redis for API caching
- CDN for frontend assets
- Database query caching

---

## Maintenance

### Daily
- Check application logs
- Monitor error rates
- Review Google Sheets sync status

### Weekly
- Database backup verification
- Security updates
- Performance review

### Monthly
- Database maintenance (VACUUM)
- Archive old data
- Review and optimize queries
- Update dependencies

---

## Rollback Procedure

1. **Stop services**
   ```bash
   pm2 stop crane-api
   sudo systemctl stop nginx
   ```

2. **Restore database backup**
   ```bash
   psql -U crane_user -d crane_maintenance < backup.sql
   ```

3. **Revert application code**
   ```bash
   git checkout previous-version
   npm install
   ```

4. **Restart services**
   ```bash
   pm2 restart crane-api
   sudo systemctl restart nginx
   ```

---

## Support Contacts

- **Database Issues**: DBA team
- **Server Issues**: DevOps team
- **Application Issues**: Development team
- **Google Sheets**: Cloud admin

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [nginx Configuration](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**End of Deployment Guide**
