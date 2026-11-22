import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuditAction, AuditEvent } from '../entities/audit-event.entity';
import type { User } from '../entities/user.entity';
import { AuditRepository } from './audit.repository';
import { requestContext } from '../common/http/request-context';
import type { QueryAuditDto } from './dto/query-audit.dto';

export interface AuditActor {
  id: string;
  name?: string;
  email?: string;
  sessionId?: string;
}

export interface AuditInput {
  businessId: string;
  /** Null when nobody is signed in. */
  actor: AuditActor | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** Defaults to the current request's ip and user agent. */
  context?: { ip?: string; userAgent?: string };
}

/** The actor for an action a user takes on their own account. */
export function actorOf(
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>,
  sessionId?: string,
): AuditActor {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return {
    id: user.id,
    name: name || user.email,
    email: user.email,
    sessionId,
  };
}

/** The business a user's own account events belong to. */
export const businessOf = (user: Pick<User, 'id' | 'businessId'>) =>
  user.businessId ?? user.id;

/** Keys whose values never reach the audit trail. */
const SECRET_KEY = /(password|secret|token|hash)/i;
const SECRET_EXACT = new Set(['code', 'codes', 'backupcodes']);

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEY.test(k) || SECRET_EXACT.has(k.toLowerCase())
          ? '[redacted]'
          : redact(v),
      ]),
    );
  }
  return value;
}

const encodeCursor = (e: Pick<AuditEvent, 'createdAt' | 'id'>) =>
  Buffer.from(`${e.createdAt.toISOString()}|${e.id}`).toString('base64url');

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const [at, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = new Date(at);
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException('Invalid cursor');
  }
  return { createdAt, id };
}

/**
 * The append-only record of who did what. `record` must be called inside
 * the same unit of work (TransactionRunner.run or a repository transaction)
 * as the change it describes, so both commit or neither does.
 */
@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async record(input: AuditInput): Promise<void> {
    const ctx = input.context ?? requestContext();
    await this.repo.append(input.businessId, {
      actorUserId: input.actor?.id ?? null,
      actorName: (input.actor?.name || input.actor?.email || 'System').slice(
        0,
        200,
      ),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before
        ? (redact(input.before) as Record<string, unknown>)
        : null,
      after: input.after
        ? (redact(input.after) as Record<string, unknown>)
        : null,
      ip: ctx.ip?.slice(0, 64) ?? null,
      userAgent: ctx.userAgent?.slice(0, 512) ?? null,
      sessionId: input.actor?.sessionId ?? null,
    });
  }

  async list(businessId: string, query: QueryAuditDto) {
    const rows = await this.repo.list(businessId, {
      actorUserId: query.actor,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      from: query.from,
      to: query.to,
      before: query.cursor ? decodeCursor(query.cursor) : undefined,
      limit: query.limit + 1,
    });
    const data = rows.slice(0, query.limit);
    const more = rows.length > query.limit;
    return {
      data,
      nextCursor: more ? encodeCursor(data[data.length - 1]) : null,
    };
  }

  /** Page-numbered view for the team activity feed. */
  page(businessId: string, page: number, limit: number) {
    return this.repo.page(businessId, page, limit);
  }
}
