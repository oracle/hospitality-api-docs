# TypeScript Types Usage Guide

This repository provides TypeScript type definitions generated from Oracle Hospitality OpenAPI specifications. The types can be consumed in other projects via git submodule.

## Table of Contents

- [Adding as Git Submodule](#adding-as-git-submodule)
- [TypeScript Configuration](#typescript-configuration)
- [Usage Examples](#usage-examples)
- [Available APIs](#available-apis)
- [Updating Types](#updating-types)
- [Troubleshooting](#troubleshooting)

## Adding as Git Submodule

### Initial Setup

Add this repository as a submodule to your project:

```bash
# Add the submodule
git submodule add <repository-url> libs/oracle-api-types

# Initialize and update the submodule
git submodule update --init --recursive

# Commit the submodule addition
git add .gitmodules libs/oracle-api-types
git commit -m "Add Oracle Hospitality API types submodule"
```

### Cloning a Project with Submodules

When cloning a repository that already has this submodule:

```bash
# Clone with submodules
git clone --recurse-submodules <your-repo-url>

# Or if already cloned without submodules
git submodule update --init --recursive
```

## TypeScript Configuration

### Configure Path Mapping

Add path mappings to your `tsconfig.json` to easily import types:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@oracle/api-types/*": ["./libs/oracle-api-types/types/*"]
    }
  }
}
```

### Alternative: Direct Imports

If you prefer not to use path mapping, you can import types directly:

```typescript
import type { paths, components } from '../libs/oracle-api-types/types/property/evm';
```

## Usage Examples

### Property API - Events Management

```typescript
import type { paths, components } from '@oracle/api-types/property/evm';

// Event types
type Event = components['schemas']['Event'];
type EventType = components['schemas']['EventType'];

// Request/Response types for POST /events
type CreateEventRequest = 
  paths['/events']['post']['requestBody']['content']['application/json'];

type CreateEventResponse = 
  paths['/events']['post']['responses']['201']['content']['application/json'];

// Path parameters
type GetEventParams = paths['/events/{eventId}']['get']['parameters']['path'];

// Example function with typed parameters
async function createEvent(
  eventData: CreateEventRequest
): Promise<CreateEventResponse> {
  // Your API call implementation
}
```

### Property API - Customer Relationship Management

```typescript
import type { paths, components } from '@oracle/api-types/property/crm';

// Profile types
type Profile = components['schemas']['Profile'];
type ProfileType = components['schemas']['ProfileType'];

// Search profiles
type SearchProfilesRequest = 
  paths['/profiles']['get']['parameters']['query'];

type SearchProfilesResponse = 
  paths['/profiles']['get']['responses']['200']['content']['application/json'];
```

### Property API - Reservations

```typescript
import type { paths, components } from '@oracle/api-types/property/rsv';

// Reservation types
type Reservation = components['schemas']['Reservation'];
type ReservationStatus = components['schemas']['ReservationStatus'];

// Create reservation
type CreateReservationRequest = 
  paths['/reservations']['post']['requestBody']['content']['application/json'];

type CreateReservationResponse = 
  paths['/reservations']['post']['responses']['201']['content']['application/json'];
```

### Distribution API

```typescript
import type { paths, components } from '@oracle/api-types/distribution/distribution';

// Distribution types
type Availability = components['schemas']['Availability'];
type RatePlan = components['schemas']['RatePlan'];

// Get availability
type GetAvailabilityParams = 
  paths['/availability']['get']['parameters']['query'];

type AvailabilityResponse = 
  paths['/availability']['get']['responses']['200']['content']['application/json'];
```

### OAuth Authentication

```typescript
import type { paths, components } from '@oracle/api-types/property/oauth';

// Token types
type TokenResponse = components['schemas']['OAuth2TokenResponse'];

// Token request
type TokenRequest = 
  paths['/tokens']['post']['requestBody']['content']['application/x-www-form-urlencoded'];

async function getAuthToken(credentials: TokenRequest): Promise<TokenResponse> {
  // Your token request implementation
}
```

## Available APIs

The types are organized by API category:

### Property APIs (`types/property/`)

- `act.d.ts` - Activities
- `ars.d.ts` - Accounts Receivable
- `blk.d.ts` - Block Management
- `chl.d.ts` - Channel Management
- `cms.d.ts` - Content Management
- `crm.d.ts` - Customer Relationship Management
- `csh.d.ts` - Cashiering
- `dvm.d.ts` - Device Management
- `evm.d.ts` - Events Management
- `fof.d.ts` - Front Office
- `hsk.d.ts` - Housekeeping
- `int.d.ts` - Interfaces
- `inv.d.ts` - Inventory
- `lms.d.ts` - Lead Management
- `lov.d.ts` - List of Values
- `oauth.d.ts` - Authentication
- `ops.d.ts` - Operations
- `par.d.ts` - Profiles and Rates
- `rmr.d.ts` - Rate Management Reports
- `rsv.d.ts` - Reservations
- `rtp.d.ts` - Rate Plans
- And more...

### Configuration APIs (`types/property/*cfg.d.ts`)

Configuration endpoints for various modules (e.g., `rsvcfg.d.ts`, `crmcfg.d.ts`, etc.)

### Async APIs (`types/property/*async.d.ts`)

Asynchronous operation endpoints (e.g., `rsvasync.d.ts`, `blkasync.d.ts`, etc.)

### Distribution APIs (`types/distribution/`)

- `distribution.d.ts` - Main distribution API
- `distributionauthentication.d.ts` - Authentication
- `distributioncontent.d.ts` - Content management
- `distributionshop.d.ts` - Shopping/availability
- And more...

### NOR1 APIs (`types/nor1/`)

- `publishedUpsellOffers.d.ts` - Upsell offers

## Updating Types

### When Specs Are Updated

When the OpenAPI specifications in this repository are updated, regenerate the types:

```bash
# In the oracle-api-types repository
cd libs/oracle-api-types

# Install dependencies (if not already done)
npm install

# Regenerate all types
npm run rebuild

# Commit the updated types
git add types/
git commit -m "Update generated types"
git push
```

### Updating Submodule in Your Project

To pull the latest types into your project:

```bash
# Update the submodule to the latest commit
cd libs/oracle-api-types
git pull origin main

# Return to your project root
cd ../..

# Commit the submodule update
git add libs/oracle-api-types
git commit -m "Update Oracle API types"
```

## Troubleshooting

### Types Not Found

If TypeScript cannot find the types:

1. Verify the submodule is initialized:
   ```bash
   git submodule update --init --recursive
   ```

2. Check that the `types/` directory exists in the submodule:
   ```bash
   ls libs/oracle-api-types/types/
   ```

3. Verify your `tsconfig.json` path mapping is correct

### Type Errors

If you encounter type errors:

1. Ensure you're using TypeScript 5.x or higher
2. Enable `noUncheckedIndexedAccess` in `tsconfig.json` for better type safety
3. Check that you're importing from the correct API module

### Submodule Issues

If the submodule appears empty:

```bash
# Reinitialize the submodule
git submodule deinit -f libs/oracle-api-types
git submodule update --init --recursive
```

### Build From Source

If you need to regenerate types locally:

```bash
cd libs/oracle-api-types

# Install dependencies
npm install

# Generate types
npm run build:types
```

## Best Practices

1. **Version Control**: Always commit submodule updates as separate commits
2. **Type Safety**: Use `noUncheckedIndexedAccess` for safer array/object access
3. **Path Aliases**: Use path mapping for cleaner imports
4. **Specific Imports**: Import only the types you need to reduce bundle size
5. **Documentation**: Reference the OpenAPI specs for detailed endpoint documentation

## Support

For issues related to:
- **Type generation**: Open an issue in this repository
- **API functionality**: Consult the Oracle Hospitality API documentation
- **OpenAPI specs**: Check the `rest-api-specs/` directory

## License

These types are generated from Oracle Hospitality OpenAPI specifications and are subject to the Universal Permissive License v 1.0 (UPL).

