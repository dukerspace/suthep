# Testing Guide

Suthep uses [Vitest](https://vitest.dev/) for unit tests and [vite-plugin-doctest](https://github.com/ssssota/doc-vitest) to keep documentation examples executable. This page is both user documentation and a live test suite.

## Project Layout

| Path | Description |
|------|-------------|
| `packages/cli/src/**/__tests__/` | Unit tests co-located with CLI source |
| `packages/cli/vitest.config.ts` | Vitest + doctest configuration |
| `docs/09-testing.md` | This file (English doctest examples) |
| `docs/th/09-testing.md` | Thai doctest examples |

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/dukerspace/suthep.git
cd suthep
pnpm install
```

## Running Tests

```bash
# Run all tests once (unit tests + documentation examples)
pnpm test

# Watch mode during development
pnpm test:watch

# Interactive UI
pnpm test:ui

# Coverage report
pnpm test:coverage
```

Run tests for the CLI package only:

```bash
pnpm --filter @suthep/cli test
```

## Writing Unit Tests

Test files use the `.test.ts` suffix and Vitest's `describe` / `it` / `expect` API:

```typescript
import { describe, it, expect } from 'vitest'

describe('myFeature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true)
  })
})
```

Place tests in `packages/cli/src/**/__tests__/` next to the code they cover. See existing tests such as `config-loader.test.ts` and `service-finder.test.ts` for patterns (mocking `fs-extra`, `execa`, and other I/O).

## Documentation Tests (Doctest)

Code blocks marked with `@import.meta.vitest` in this file are executed by Vitest when you run `pnpm test`. That keeps examples in sync with the implementation.

### Find a service by name

The `suthep logs` and `suthep restart` commands resolve services by name or 1-based index. The helper `findServiceByIdentifier` implements that lookup:

```ts:find-by-name.md@import.meta.vitest
const { findServiceByIdentifier } = await import('../../packages/cli/src/utils/service-finder.ts')
const service = findServiceByIdentifier(sampleConfig, 'api')
expect(service?.name).toBe('api')
```

### Find a service by index

```ts:find-by-index.md@import.meta.vitest
const { findServiceByIdentifier } = await import('../../packages/cli/src/utils/service-finder.ts')
const service = findServiceByIdentifier(sampleConfig, '2')
expect(service?.name).toBe('web')
```

### List available services

When a service is not found, the CLI shows a numbered list built by `getAvailableServicesList`:

```ts:service-list.md@import.meta.vitest
const { getAvailableServicesList } = await import('../../packages/cli/src/utils/service-finder.ts')
const list = getAvailableServicesList(sampleConfig)
expect(list).toContain('1. api')
expect(list).toContain('2. web')
```

### Service not found error

```ts:service-not-found.md@import.meta.vitest
const { getServiceNotFoundError } = await import('../../packages/cli/src/utils/service-finder.ts')
const message = getServiceNotFoundError('missing', sampleConfig)
expect(message).toContain('Service "missing" not found')
expect(message).toContain('1. api')
```

## CI Integration

Include tests in deployment pipelines before `suthep deploy`:

```bash
pnpm test
suthep deploy
```

Example GitHub Actions step:

```yaml
- run: pnpm install
- run: pnpm test
```

## Next Steps

- Review [Examples](./06-examples.md) for deployment scenarios
- See [Advanced Topics](./08-advanced.md) for CI/CD and automation
- Check [Troubleshooting](./07-troubleshooting.md) if tests fail locally

---

**Previous:** [Advanced Topics](./08-advanced.md) | **Back to:** [Home](/)
