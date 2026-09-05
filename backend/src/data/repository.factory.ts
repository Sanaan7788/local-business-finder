import { IBusinessRepository } from './repository.interface';
import { PostgresBusinessRepository } from './postgres/postgres.repository';

// ---------------------------------------------------------------------------
// Repository access point. Services depend on IBusinessRepository, never on
// the Postgres class, so storage can still be swapped in one place.
// ---------------------------------------------------------------------------

let _instance: IBusinessRepository | null = null;

export function getRepository(): IBusinessRepository {
  return (_instance ??= new PostgresBusinessRepository());
}
