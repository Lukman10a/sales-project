import { hashPassword } from '../auth/passwords/password-hasher';
import { ROLE_PRESETS } from '../common/constants/permissions';
import dataSource from './data-source';
import { User } from '../entities/user.entity';
import { TeamMember } from '../entities/team-member.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Sale } from '../entities/sale.entity';
import { ReceiptCounter } from '../entities/receipt-counter.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { buildDemoData, DEMO_OWNER_EMAIL, stockStatus } from './demo-data';

/**
 * `pnpm db:seed` — creates the demo business (owner, manager, cashier,
 * 20 products, 30 days of sales). Idempotent: if the demo owner already
 * exists nothing is written. Refuses to run in production unless
 * SEED_ALLOW_PRODUCTION=true (staging).
 */
async function seed() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SEED_ALLOW_PRODUCTION !== 'true'
  ) {
    throw new Error(
      'Refusing to seed with NODE_ENV=production (set SEED_ALLOW_PRODUCTION=true for staging)',
    );
  }
  const password = process.env.SEED_PASSWORD ?? 'LuxaDemo#2026';

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (em) => {
      const existing = await em.findOne(User, {
        where: { email: DEMO_OWNER_EMAIL },
      });
      if (existing) {
        console.log(`Demo business already seeded (${DEMO_OWNER_EMAIL}).`);
        return;
      }

      const hash = await hashPassword(password);
      const businessName = 'Ade Mart (demo)';
      const owner = await em.save(
        em.create(User, {
          email: DEMO_OWNER_EMAIL,
          password: hash,
          firstName: 'Ade',
          lastName: 'Okafor',
          businessName,
          role: 'owner',
          status: 'active',
          emailVerifiedAt: new Date(),
        }),
      );
      owner.businessId = owner.id;
      await em.save(owner);

      const staff = {
        manager: { first: 'Bisi', last: 'Adeyemi', role: 'manager' as const },
        cashier: { first: 'Chidi', last: 'Eze', role: 'cashier' as const },
      };
      const ids: Record<'owner' | 'manager' | 'cashier', string> = {
        owner: owner.id,
        manager: '',
        cashier: '',
      };
      for (const [key, s] of Object.entries(staff) as Array<
        [keyof typeof staff, (typeof staff)[keyof typeof staff]]
      >) {
        const user = await em.save(
          em.create(User, {
            email: `${key}@demo.luxa.app`,
            password: hash,
            firstName: s.first,
            lastName: s.last,
            businessName,
            businessId: owner.id,
            role: s.role,
            status: 'active',
          }),
        );
        ids[key] = user.id;
        await em.save(
          em.create(TeamMember, {
            businessId: owner.id,
            userId: user.id,
            name: `${s.first} ${s.last}`,
            role: s.role,
            permissions: [...ROLE_PRESETS[s.role].permissions],
            maxDiscountPercent: ROLE_PRESETS[s.role].maxDiscountPercent,
            status: 'active',
            joinedDate: new Date(),
          }),
        );
      }

      const { products, sales } = buildDemoData(new Date());
      const productIds = new Map<string, { id: string; name: string }>();
      for (const p of products) {
        const item = await em.save(
          em.create(InventoryItem, {
            businessId: owner.id,
            name: p.name,
            category: [p.category],
            sku: p.sku,
            wholesalePrice: p.wholesalePrice,
            sellingPrice: p.sellingPrice,
            quantity: p.quantity,
            reorderPoint: p.reorderPoint,
            sold: p.sold,
            status: stockStatus(p.quantity, p.reorderPoint),
            createdBy: owner.id,
          }),
        );
        productIds.set(p.sku, { id: item.id, name: item.name });
      }

      let receiptNumber = 0;
      for (const s of sales) {
        receiptNumber += 1;
        await em.save(
          em.create(Sale, {
            businessId: owner.id,
            receiptNumber,
            subtotal: s.total,
            discountAmount: 0,
            vatAmount: 0,
            total: s.total,
            paymentMethod: s.paymentMethod,
            status: 'completed',
            saleDate: s.saleDate,
            soldBy: ids[s.soldBy],
            discountPercent: 0,
            items: s.items.map((i) => {
              const product = productIds.get(i.sku)!;
              return em.create(SaleItem, {
                productId: product.id,
                productName: product.name,
                quantity: i.quantity,
                price: i.price,
                total: i.total,
              });
            }),
          }),
        );
      }

      await em.save(
        em.create(ReceiptCounter, {
          businessId: owner.id,
          lastNumber: receiptNumber,
        }),
      );

      console.log(
        `Seeded ${businessName}: 3 users, ${products.length} products, ${sales.length} sales.`,
      );
      console.log(
        `Sign in as ${DEMO_OWNER_EMAIL} (also manager@/cashier@demo.luxa.app); password from SEED_PASSWORD or the README.`,
      );
    });
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
