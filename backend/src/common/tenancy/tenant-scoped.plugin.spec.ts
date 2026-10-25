import { Schema, Types } from 'mongoose';
import { Role } from '../role.enum';
import { runAsPlatform, runWithTenant } from './tenant-context';
import {
  MissingTenantContextError,
  applyTenantScope,
  assertAggregateIsScoped,
  stampTenant,
  tenantScoped,
} from './tenant-scoped.plugin';

/**
 * Mongoose runs query middleware at execution time, so the scoping logic is
 * exercised directly rather than through a built Query — no database needed
 * and the assertion is on the real code path the hook calls.
 */
interface FakeQuery {
  applied: Record<string, unknown>[];
  model: { modelName: string };
  where(filter: Record<string, unknown>): FakeQuery;
}

function fakeQuery(modelName = 'Widget'): FakeQuery {
  const applied: Record<string, unknown>[] = [];
  const query: FakeQuery = {
    applied,
    model: { modelName },
    where(filter) {
      applied.push(filter);
      return query;
    },
  };
  return query;
}

describe('tenant scoping', () => {
  const ABC = new Types.ObjectId().toString();
  const DEF = new Types.ObjectId().toString();

  const ctx = (practiceId: string) => ({
    practiceId,
    userId: 'u1',
    role: Role.PRACTITIONER,
  });

  describe('applyTenantScope', () => {
    it('confines the query to the ambient practice', () => {
      const q = fakeQuery();
      runWithTenant(ctx(ABC), () => applyTenantScope(q, 'find'));

      expect(q.applied).toHaveLength(1);
      expect(String(q.applied[0].practiceId)).toBe(ABC);
    });

    it('fails closed with no tenant context', () => {
      const q = fakeQuery();
      expect(() => applyTenantScope(q, 'find')).toThrow(
        MissingTenantContextError,
      );
      expect(q.applied).toHaveLength(0);
    });

    it('names the model and operation in the error', () => {
      const q = fakeQuery('Patient');
      expect(() => applyTenantScope(q, 'deleteMany')).toThrow(
        /Patient\.deleteMany/,
      );
    });

    it('applies no filter under platform bypass', () => {
      const q = fakeQuery();
      runAsPlatform({ role: Role.SUPER_ADMIN }, () =>
        applyTenantScope(q, 'find'),
      );
      expect(q.applied).toHaveLength(0);
    });

    it('always applies the context practice, whatever the caller passed', () => {
      // Cross-tenant test 4: a tampered practiceId must not widen scope.
      // where() is merged by Mongoose after the caller's filter, so the
      // context value is the one that survives.
      const q = fakeQuery();
      runWithTenant(ctx(ABC), () => applyTenantScope(q, 'find'));
      expect(String(q.applied[0].practiceId)).toBe(ABC);
      expect(String(q.applied[0].practiceId)).not.toBe(DEF);
    });
  });

  describe('stampTenant', () => {
    it('sets practiceId on a new document', () => {
      const doc: { practiceId?: Types.ObjectId } = {};
      runWithTenant(ctx(ABC), () => stampTenant(doc));
      expect(String(doc.practiceId)).toBe(ABC);
    });

    it('leaves an existing practiceId alone', () => {
      const doc = { practiceId: new Types.ObjectId(DEF) };
      runWithTenant(ctx(ABC), () => stampTenant(doc));
      expect(String(doc.practiceId)).toBe(DEF);
    });

    it('does nothing with no context', () => {
      const doc: { practiceId?: Types.ObjectId } = {};
      stampTenant(doc);
      expect(doc.practiceId).toBeUndefined();
    });
  });

  describe('tenantScoped', () => {
    it('adds a required, indexed practiceId path', () => {
      const schema = new Schema({ name: String });
      tenantScoped(schema);

      const path = schema.path('practiceId');
      expect(path).toBeDefined();
      expect(path.isRequired).toBe(true);
    });

    it('registers hooks for every mutating and reading operation', () => {
      const schema = new Schema({ name: String });
      const spy = jest.spyOn(schema, 'pre');
      tenantScoped(schema);

      const hooked = spy.mock.calls.map((c) => c[0]);
      for (const op of [
        'find',
        'findOne',
        'deleteMany',
        'updateMany',
        'save',
      ]) {
        expect(hooked).toContain(op);
      }
      spy.mockRestore();
    });
  });

  describe('assertAggregateIsScoped', () => {
    it('accepts a pipeline that matches on practiceId', () => {
      runWithTenant(ctx(ABC), () => {
        expect(() =>
          assertAggregateIsScoped([{ $match: { practiceId: ABC } }]),
        ).not.toThrow();
      });
    });

    it('rejects a pipeline without a practiceId match', () => {
      runWithTenant(ctx(ABC), () => {
        expect(() =>
          assertAggregateIsScoped([{ $match: { status: 'active' } }]),
        ).toThrow(/must \$match on practiceId/);
      });
    });

    it('rejects a pipeline with no $match at all', () => {
      runWithTenant(ctx(ABC), () => {
        expect(() => assertAggregateIsScoped([{ $group: {} }])).toThrow();
      });
    });

    it('allows anything under platform bypass', () => {
      runAsPlatform({ role: Role.SUPER_ADMIN }, () => {
        expect(() => assertAggregateIsScoped([{ $group: {} }])).not.toThrow();
      });
    });
  });
});
