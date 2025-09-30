# Fertilizer Price Regulation Backend

A Django + DRF backend system for managing fertilizer prices and regulations with JWT authentication, role-based access control, and comprehensive pricing validation.

## Features

- **JWT Authentication** with role-based access control (Government Admin, District Officer, Retailer, Farmer, Inspector)
- **Price Management** with reference prices and published prices
- **Price Validation** with configurable markup limits
- **Audit Trail** for all price-related activities
- **Farmer Price Query** with Redis caching
- **Complaint Management** system
- **Docker Support** for both local development and Neon Postgres deployment

## Project Structure

```
pricegov/
├── apps/
│   ├── accounts/          # User management and authentication
│   ├── districts/         # District management
│   ├── catalog/           # SKU/product catalog
│   ├── retailers/         # Retailer profiles
│   ├── pricing/           # Price management and validation
│   └── complaints/        # Complaint management
├── pricegov/              # Django project settings
├── fixtures/              # Initial data fixtures
├── tests/                 # Test suites
├── docker-compose.yml     # Local development setup
├── docker-compose.neon.yml # Neon Postgres setup
└── requirements.txt       # Python dependencies
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Neon Postgres account (for production)

### Local Development Setup

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd pricegov
   cp env.example .env
   ```

2. **Start local development environment:**
   ```bash
   make up
   ```

3. **Run migrations:**
   ```bash
   make migrate
   ```

4. **Create superuser:**
   ```bash
   make createsuperuser
   ```

5. **Seed initial data:**
   ```bash
   make seed-data
   ```

6. **Access the application:**
   - API: http://localhost:8000/api/v1/
   - Admin: http://localhost:8000/admin/
   - API Docs: http://localhost:8000/api/docs/

### Neon Postgres Setup

1. **Get Neon connection string:**
   - Sign up at [Neon](https://neon.tech)
   - Create a new project
   - Copy the connection string from the dashboard
   - Ensure it includes `?sslmode=require`

2. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgres://user:password@host:port/dbname?sslmode=require"
   ```

3. **Start with Neon:**
   ```bash
   docker-compose -f docker-compose.neon.yml up -d
   ```

4. **Run migrations:**
   ```bash
   docker-compose -f docker-compose.neon.yml exec web python manage.py migrate
   ```

5. **Seed data:**
   ```bash
   docker-compose -f docker-compose.neon.yml exec web python manage.py seed_data
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL="postgres://user:password@host:port/dbname?sslmode=require"

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Django Configuration
SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Pricing Configuration
PRICING_MAX_MARKUP_PCT=0.10

# JWT Configuration
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register/` - User registration
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/token/refresh/` - Refresh JWT token

### Districts
- `GET /api/v1/districts/` - List districts
- `GET /api/v1/districts/tree/` - Get district hierarchy

### Catalog
- `GET /api/v1/catalog/` - List SKUs
- `GET /api/v1/catalog/{id}/` - Get SKU details

### Retailers
- `POST /api/v1/retailers/create-profile/` - Create retailer profile
- `GET /api/v1/retailers/profile/` - Get retailer profile

### Pricing
- `GET /api/v1/pricing/reference-prices/` - List reference prices (Admin)
- `POST /api/v1/pricing/reference-prices/` - Create reference price (Admin)
- `GET /api/v1/pricing/published-prices/` - List published prices
- `POST /api/v1/pricing/published-prices/` - Create published price (Retailer)
- `GET /api/v1/pricing/audit/` - List price audit records (Admin)

### Farmer API
- `GET /api/v1/farmer/prices/?sku={id}&district={id}` - Get price data for farmers

### Complaints
- `GET /api/v1/complaints/` - List complaints
- `POST /api/v1/complaints/` - Create complaint

## User Roles

- **Government Admin**: Full access to all features
- **District Officer**: District-level management
- **Retailer**: Can create published prices and manage profile
- **Farmer**: Can query prices and create complaints
- **Inspector**: Can review and manage complaints

## Sample Users (After Seeding)

- **Admin**: admin@pricegov.com / admin123
- **Retailer**: retailer@example.com / retailer123
- **Farmer**: farmer@example.com / farmer123

## Testing

Run the test suite:

```bash
# Using Django test runner
make test

# Using pytest
make test-pytest
```

## Development Commands

```bash
# Start development environment
make up

# Stop development environment
make down

# Run migrations
make migrate

# Create superuser
make createsuperuser

# Run tests
make test

# Format code
make format

# Run linting
make lint

# Seed data
make seed-data

# View logs
make logs
```

## Production Deployment

### Using Neon Postgres

1. **Set up Neon database:**
   - Create a Neon project
   - Get the connection string
   - Set `DATABASE_URL` environment variable

2. **Configure production settings:**
   ```env
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=your-domain.com
   SECRET_KEY=your-production-secret-key
   ```

3. **Deploy with Docker:**
   ```bash
   docker-compose -f docker-compose.neon.yml up -d
   ```

### Connection Pooling

For production with Neon, consider using connection pooling:

```python
# In settings.py
DATABASES = {
    'default': dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

## API Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Postman Collection**: Import `postman_collection.json`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
