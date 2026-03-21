import { IBusinessRepository } from './repository.interface';

// ---------------------------------------------------------------------------
// Repository Factory
//
// Single place to wire up a storage backend.
// To add a new backend: implement IBusinessRepository, add a case below.
//
// Usage (in services):
//   import { getRepository } from '../data/repository.factory';
//   const repo = getRepository();
// ---------------------------------------------------------------------------

let _instance: IBusinessRepository | null = null;

export function getRepository(): IBusinessRepository {
  if (_instance) return _instance;

  const backend = process.env.STORAGE_BACKEND ?? 'csv';

  if (backend === 'csv') {
    const { CsvBusinessRepository } = require('./csv.repository');
    _instance = new CsvBusinessRepository();
    return _instance!;
  }

  throw new Error(`Unknown STORAGE_BACKEND: "${backend}". Only "csv" is supported right now.`);
}

// Exposed for testing — allows injecting a mock repository
export function setRepository(repo: IBusinessRepository): void {
  _instance = repo;
}

// Reset singleton (used in tests between test cases)
export function resetRepository(): void {
  _instance = null;
}
