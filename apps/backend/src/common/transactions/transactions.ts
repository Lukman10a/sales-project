import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  type ObjectLiteral,
} from 'typeorm';

/**
 * The transaction a unit of work is running in, carried implicitly so a
 * change and the audit event describing it commit or roll back together
 * without every call passing an EntityManager.
 */
const active = new AsyncLocalStorage<EntityManager>();

/** The EntityManager of the surrounding transaction, if any. */
export const activeManager = (): EntityManager | undefined => active.getStore();

/**
 * Runs `fn` in a transaction. Inside one already, it joins it, so services
 * compose: the outermost call decides commit or rollback.
 */
export function runInTransaction<T>(
  dataSource: DataSource,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const current = active.getStore();
  if (current) return fn(current);
  return dataSource.transaction((manager) =>
    active.run(manager, () => fn(manager)),
  );
}

/** Injectable form of `runInTransaction` for services. */
@Injectable()
export class TransactionRunner {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  run<T>(fn: () => Promise<T>): Promise<T> {
    return runInTransaction(this.dataSource, () => fn());
  }
}

/**
 * A Repository whose queries use the surrounding transaction when there is
 * one. TypeORM routes every Repository method through `this.manager`, so
 * redirecting that one property makes the whole repository transactional.
 */
export abstract class TransactionalRepository<
  T extends ObjectLiteral,
> extends Repository<T> {}

const BASE_MANAGER = Symbol('baseManager');
Object.defineProperty(TransactionalRepository.prototype, 'manager', {
  configurable: true,
  get(this: { [BASE_MANAGER]: EntityManager }) {
    return active.getStore() ?? this[BASE_MANAGER];
  },
  set(this: { [BASE_MANAGER]: EntityManager }, manager: EntityManager) {
    this[BASE_MANAGER] = manager;
  },
});
