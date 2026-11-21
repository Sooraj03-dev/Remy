// server/src/config/testDb.ts
// In-memory database adapter for automated unit & integration testing
// Activated only in test mode when DATABASE_URL is not set.

export interface MockUser {
  id: string;
  clerkId: string;
  fullName: string;
  email: string;
  university: string | null;
  avatarUrl: string | null;
  role: string;
  rating: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockProduct {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  price: string;
  category: string;
  condition: string;
  status: string;
  images: string[];
  aiVerified: boolean;
  verifierId: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  campusLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mockUsersStore: MockUser[] = [];
export const mockProductsStore: MockProduct[] = [];

export function resetMockStore() {
  mockUsersStore.length = 0;
  mockProductsStore.length = 0;
}

function extractTargetId(clause: unknown): string | null {
  if (!clause || typeof clause !== 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyClause = clause as any;
  if (Array.isArray(anyClause.queryChunks)) {
    for (const chunk of anyClause.queryChunks) {
      if (
        chunk &&
        (chunk.constructor?.name === 'Param' || 'brand' in chunk) &&
        typeof chunk.value === 'string'
      ) {
        return chunk.value;
      }
    }
  }
  if (typeof anyClause.value === 'string') return anyClause.value;
  if (typeof anyClause.right?.value === 'string') return anyClause.right.value;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTestDb(): any {
  return {
    select: (fields?: unknown) => ({
      from: (table: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableName =
          (table as any)?.[Symbol.for('drizzle:Name')] || (table as any)?._?.name;
        const isUsers = tableName === 'users';

        // When select is invoked for count
        if (fields && typeof fields === 'object') {
          return {
            where: () => [{ count: mockProductsStore.length }],
            innerJoin: () => ({
              where: () => [{ count: mockProductsStore.length }],
            }),
          };
        }

        const createQueryObj = (whereClause?: unknown) => {
          const execute = () => {
            const target = extractTargetId(whereClause);

            if (isUsers) {
              if (target) {
                return mockUsersStore.filter(
                  (u) => u.clerkId === target || u.id === target,
                );
              }
              return [...mockUsersStore];
            }

            // Products
            let filtered = [...mockProductsStore];

            if (target) {
              filtered = filtered.filter(
                (p) => p.id === target || p.sellerId === target,
              );
            } else {
              // Public marketplace: filter available or verified
              filtered = filtered.filter(
                (p) => p.status === 'available' || p.status === 'verified',
              );
            }

            return filtered.map((p) => {
              const u = mockUsersStore.find((usr) => usr.id === p.sellerId);
              return {
                products: p,
                users: u || {
                  id: p.sellerId,
                  clerkId: p.sellerId,
                  fullName: 'Student',
                  email: 's@test.com',
                },
              };
            });
          };

          const obj = {
            where: (newClause: unknown) => createQueryObj(newClause),
            orderBy: () => ({
              limit: (lim: number) => ({
                offset: (off: number) => execute().slice(off, off + lim),
              }),
              then: (resolve: (val: unknown) => void) => resolve(execute()),
              [Symbol.iterator]: () => execute()[Symbol.iterator](),
            }),
            then: (resolve: (val: unknown) => void) => resolve(execute()),
            [Symbol.iterator]: () => execute()[Symbol.iterator](),
          };

          return obj;
        };

        return {
          innerJoin: (_otherTable: unknown, _joinCondition: unknown) =>
            createQueryObj(),
          where: (whereClause: unknown) => createQueryObj(whereClause),
          orderBy: () => createQueryObj().orderBy(),
          then: (resolve: (val: unknown) => void) =>
            resolve(createQueryObj().then(resolve)),
          [Symbol.iterator]: () => createQueryObj()[Symbol.iterator](),
        };
      },
    }),

    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        returning: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tableName =
            (table as any)?.[Symbol.for('drizzle:Name')] || (table as any)?._?.name;
          if (tableName === 'users') {
            const user: MockUser = {
              id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              clerkId: (values.clerkId as string) || 'clerk_test',
              fullName: (values.fullName as string) || 'Student User',
              email: (values.email as string) || 'student@test.local',
              university: (values.university as string) || null,
              avatarUrl: (values.avatarUrl as string) || null,
              role: (values.role as string) || 'student',
              rating: '5.0',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockUsersStore.push(user);
            return [user];
          }

          // Products
          const product: MockProduct = {
            id: `prod-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            sellerId: (values.sellerId as string) || 'unknown',
            title: (values.title as string) || '',
            description: (values.description as string) || null,
            price: (values.price as string) || '0',
            category: (values.category as string) || 'other',
            condition: (values.condition as string) || 'good',
            status: (values.status as string) || 'pending_review',
            images: (values.images as string[]) || [],
            aiVerified: Boolean(values.aiVerified),
            verifierId: null,
            rejectionReason: null,
            reviewedAt: null,
            campusLocation: (values.campusLocation as string) || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockProductsStore.push(product);
          return [product];
        },
      }),
    }),

    update: (table: unknown) => ({
      set: (updates: Record<string, unknown>) => ({
        where: (whereClause: unknown) => ({
          returning: () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tableName =
              (table as any)?.[Symbol.for('drizzle:Name')] || (table as any)?._?.name;
            const targetId = extractTargetId(whereClause);

            if (tableName === 'users') {
              const u = mockUsersStore.find(
                (usr) => usr.clerkId === targetId || usr.id === targetId,
              );
              if (u) {
                Object.assign(u, updates, { updatedAt: new Date() });
                return [u];
              }
              return [];
            }

            const p = mockProductsStore.find((prd) => prd.id === targetId);
            if (p) {
              Object.assign(p, updates, { updatedAt: new Date() });
              return [p];
            }
            return [];
          },
        }),
      }),
    }),

    delete: (table: unknown) => ({
      where: (whereClause: unknown) => {
        const targetId = extractTargetId(whereClause);
        const idx = mockProductsStore.findIndex((p) => p.id === targetId);
        if (idx !== -1) {
          mockProductsStore.splice(idx, 1);
        }
        return Promise.resolve();
      },
    }),
  };
}
