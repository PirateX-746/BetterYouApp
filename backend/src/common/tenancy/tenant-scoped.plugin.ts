import { Schema, Types } from 'mongoose';
import { getTenantContext } from './tenant-context';

/**
 * Query middlewares that must be scoped. Anything that reads or mutates
 * existing documents goes through one of these.
 *
 * NOTE: aggregation pipelines are NOT covered by these hooks — Mongoose does
 * not route `.aggregate()` through query middleware. Any aggregate on a
 * tenant-owned collection must add its own `$match` on practiceId. See
 * `assertAggregateIsScoped` below.
 */
const QUERY_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'countDocuments',
  'distinct',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
] as const;

/** The subset of a Mongoose Query this plugin touches. */
interface ScopedQuery {
  model?: { modelName?: string };
  where(filter: Record<string, unknown>): unknown;
}

/** The subset of a Mongoose Document this plugin touches. */
interface ScopedDocument {
  practiceId?: Types.ObjectId;
}

export class MissingTenantContextError extends Error {
  constructor(modelName: string, op: string) {
    super(
      `Tenant context missing for ${modelName}.${op}(). A tenant-scoped ` +
        `collection was queried outside a request. Wrap platform-wide work ` +
        `in runAsPlatform(), or run this inside a request context.`,
    );
    this.name = 'MissingTenantContextError';
  }
}

/**
 * Confines a query to the ambient practice.
 *
 * Split out of the hook so it can be unit-tested directly: Mongoose runs
 * query middleware at execution time, not when the Query is built, so a test
 * would otherwise need a live database to observe the effect.
 */
export function applyTenantScope(query: ScopedQuery, opName: string): void {
  const ctx = getTenantContext();
  if (ctx?.bypass) return;

  if (!ctx?.practiceId) {
    throw new MissingTenantContextError(
      query.model?.modelName ?? 'unknown',
      opName,
    );
  }

  // Merge rather than replace, so an explicit practiceId in the caller's
  // filter cannot widen the scope — it can only ever be the same value.
  query.where({ practiceId: new Types.ObjectId(ctx.practiceId) });
}

/** Stamps the ambient practice onto a new document. */
export function stampTenant(doc: ScopedDocument): void {
  const ctx = getTenantContext();
  if (ctx?.bypass) return;
  if (!doc.practiceId && ctx?.practiceId) {
    doc.practiceId = new Types.ObjectId(ctx.practiceId);
  }
}

/**
 * Makes a collection tenant-owned.
 *
 * Adds `practiceId`, then forces it into every query and every insert from
 * the ambient tenant context. Two properties matter:
 *
 *  - It FAILS CLOSED. No context throws, rather than quietly returning every
 *    practice's rows — a forgotten scope is a loud error in development, not
 *    a silent cross-tenant leak in production.
 *  - Existing services keep working unchanged. `patientModel.find()` is now
 *    automatically scoped, which is why the existing modules need almost no
 *    edits.
 */
export function tenantScoped(schema: Schema): void {
  schema.add({
    practiceId: {
      type: Types.ObjectId,
      ref: 'Practice',
      required: true,
      index: true,
    },
  });

  // Registered one at a time: Mongoose's types accept a single hook name or
  // a RegExp, not an array of names.
  for (const hook of QUERY_HOOKS) {
    schema.pre(hook, function (this: ScopedQuery) {
      applyTenantScope(this, hook);
    });
  }

  // insertMany bypasses document middleware, so it needs its own hook.
  schema.pre('insertMany', function (docs: unknown) {
    const ctx = getTenantContext();
    if (ctx?.bypass || !ctx?.practiceId) return;

    const list = (Array.isArray(docs) ? docs : [docs]) as Record<
      string,
      unknown
    >[];
    for (const doc of list) {
      doc.practiceId = new Types.ObjectId(ctx.practiceId);
    }
  });

  schema.pre('save', function (this: ScopedDocument) {
    stampTenant(this);
  });
}

/**
 * Guard for the gap the plugin cannot close. Call at the top of any
 * aggregation over a tenant-owned collection.
 */
export function assertAggregateIsScoped(
  pipeline: Record<string, unknown>[],
): void {
  const ctx = getTenantContext();
  if (ctx?.bypass) return;

  const firstMatch = pipeline.find((stage) => '$match' in stage) as
    | { $match?: Record<string, unknown> }
    | undefined;

  if (!firstMatch?.$match || !('practiceId' in firstMatch.$match)) {
    throw new Error(
      'Aggregation over a tenant-owned collection must $match on practiceId. ' +
        'Query middleware does not cover .aggregate().',
    );
  }
}
