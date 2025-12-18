# Oracle Hospitality API Documentation

This repository contains OpenAPI specifications, Postman collections, GraphQL schemas, and TypeScript type definitions for Oracle Hospitality APIs.

## Contents

- **[rest-api-specs/](rest-api-specs/)** - OpenAPI/Swagger specifications for REST APIs
  - Property Management APIs
  - Distribution APIs
  - NOR1 Integration APIs
  
- **[postman-collections/](postman-collections/)** - Postman collections for API testing

- **[graphql/](graphql/)** - GraphQL schemas for data and streaming APIs

- **[types/](types/)** - Auto-generated TypeScript type definitions

## TypeScript Types

This repository includes auto-generated TypeScript type definitions from the OpenAPI specifications. These types can be used in TypeScript projects via git submodule.

### Quick Start

```bash
# Install dependencies
npm install

# Generate TypeScript types
npm run build:types

# Clean and regenerate
npm run rebuild
```

### Using Types in Your Project

See [TYPES_USAGE.md](TYPES_USAGE.md) for detailed instructions on:
- Adding this repo as a git submodule
- Configuring TypeScript path mappings
- Usage examples for all APIs
- Updating types when specs change

### Example Usage

```typescript
import type { paths, definitions } from '@oracle/api-types/property/rsv';

type Reservation = definitions['Reservation'];
type CreateReservationRequest = 
  paths['/reservations']['post']['requestBody']['content']['application/json'];
```

## Available APIs

### Property APIs
- **Reservations** (`rsv`) - Reservation management
- **CRM** (`crm`) - Customer relationship management
- **Events** (`evm`) - Catering and events management
- **Front Office** (`fof`) - Front office operations
- **Cashiering** (`csh`) - Cashiering and billing
- **Housekeeping** (`hsk`) - Housekeeping management
- **Blocks** (`blk`) - Block management
- **Activities** (`act`) - Activity management
- And many more...

### Distribution APIs
- **Distribution** - Main distribution API
- **Shop** - Availability and rate shopping
- **Book** - Reservation booking
- **Content** - Property content management
- **Authentication** - OAuth authentication

### NOR1 APIs
- **Upsell Offers** - Published upsell offers

## Scripts

- `npm run build:types` - Generate TypeScript types from OpenAPI specs
- `npm run clean` - Remove generated types directory
- `npm run rebuild` - Clean and regenerate all types

## Documentation

- [TYPES_USAGE.md](TYPES_USAGE.md) - Comprehensive guide for using TypeScript types
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](SECURITY.md) - Security policy
- [LICENSE.txt](LICENSE.txt) - Universal Permissive License v 1.0

## Requirements

- Node.js 14.0.0 or higher
- TypeScript 5.x (for consuming projects)

## License

This project is licensed under the Universal Permissive License v 1.0 (UPL).

Copyright (c) 2020, 2025 Oracle and/or its affiliates.

## Support

For more information about Oracle Hospitality APIs, visit:
- [Oracle Hospitality Documentation](https://docs.oracle.com/en/industries/hospitality/integration_platforms.html)
- [OPERA Cloud APIs](https://docs.oracle.com/en/industries/hospitality/opera-cloud-services.html)
