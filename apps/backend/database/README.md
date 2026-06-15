# Database Setup (PostgreSQL + Prisma)

## Struktur
- `prisma/schema.prisma` - Schema definition
- `prisma/migrations/` - SQL migrations (manual karena Prisma 7 beta)

## Commands

### Generate Prisma Client
```bash
pnpm generate
# atau
npx prisma generate
```

### Run Migrations
```bash
pnpm db:migrate
```

### Rollback Migrations
```bash
pnpm db:migrate:down
```

### Seed Database (Buat user default)
```bash
pnpm db:seed
```

## Environment
`.env`:
```
DATABASE_URL="postgresql://appuser:superSecretPassword@localhost:5432/order_portal?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
```

## Schema

### Roles
| Role | CardCode Required |
|------|-------------------|
| admin | Tidak (nullable) |
| sales_admin | Tidak (nullable) |
| customer | Ya (untuk sync SAP) |

### Users
| Field | Type |
|-------|------|
| id | Int (PK) |
| email | String (unique) |
| passwordHash | String |
| name | String |
| company | String? |
| cardCode | String? (SAP CardCode) |
| roleId | Int (FK ke roles) |
| isActive | Boolean (default: true) |

## Default Users (Seed)
- Admin: `admin@tsm.com` / `admin123` (tanpa CardCode)
- Sales Admin: `salesadmin@tsm.com` / `salesadmin123` (tanpa CardCode)  
- Customer: `customer@tsm.com` / `customer123` (CardCode: C001)