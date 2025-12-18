# Generated TypeScript Types

This directory contains auto-generated TypeScript type definitions from Oracle Hospitality OpenAPI specifications.

## ⚠️ Important

**DO NOT edit these files manually.** They are automatically generated from the OpenAPI specs in `rest-api-specs/`.

## Regenerating Types

If the OpenAPI specifications are updated, regenerate the types:

```bash
npm run rebuild
```

## Structure

The types mirror the structure of the `rest-api-specs/` directory:

- `property/` - Property Management APIs (46 files)
- `distribution/` - Distribution APIs (11 files)
- `nor1/` - NOR1 Integration APIs (1 file)

## Usage

See [TYPES_USAGE.md](../TYPES_USAGE.md) in the root directory for detailed usage instructions.

## Quick Example

```typescript
import type { paths, definitions } from './property/oauth';

type TokenResponse = definitions['OAuth2TokenResponse'];
type TokenRequest = paths['/tokens']['post']['parameters']['formData'];
```

