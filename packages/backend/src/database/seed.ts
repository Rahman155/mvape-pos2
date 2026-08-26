/**
 * Database seeding script for initial development data
 * Run with: npm run seed
 */

import { db } from './connection.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

interface SeedData {
  stores: any[];
  users: any[];
  products: any[];
  members: any[];
}

const seedData: SeedData = {
  stores: [
    {
      id: uuidv4(),
      name: 'Vape Store Pusat',
      address: 'Jl. Merdeka No. 123, Jakarta',
      phone: '021-1234567',
      operating_hours: {
        monday: { open: '09:00', close: '21:00' },
        tuesday: { open: '09:00', close: '21:00' },
        wednesday: { open: '09:00', close: '21:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '21:00' },
        saturday: { open: '09:00', close: '22:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'Vape Store Cabang',
      address: 'Jl. Sudirman No. 456, Bandung',
      phone: '022-9876543',
      operating_hours: {
        monday: { open: '10:00', close: '20:00' },
        tuesday: { open: '10:00', close: '20:00' },
        wednesday: { open: '10:00', close: '20:00' },
        thursday: { open: '10:00', close: '20:00' },
        friday: { open: '10:00', close: '20:00' },
        saturday: { open: '09:00', close: '21:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      is_active: true,
    },
  ],
  users: [
    {
      id: uuidv4(),
      username: 'owner1',
      email: 'owner@vapestore.com',
      password_hash: '', // Will be hashed
      role: 'OWNER',
      store_id: null,
      is_active: true,
    },
    {
      id: uuidv4(),
      username: 'kasir1',
      email: 'kasir1@vapestore.com',
      password_hash: '', // Will be hashed
      role: 'KASIR',
      store_id: '', // Will be set to first store
      is_active: true,
    },
    {
      id: uuidv4(),
      username: 'kasir2',
      email: 'kasir2@vapestore.com',
      password_hash: '', // Will be hashed
      role: 'KASIR',
      store_id: '', // Will be set to second store
      is_active: true,
    },
  ],
  products: [
    {
      id: uuidv4(),
      name: 'Liquid Vape Regular Vanilla',
      sku: 'LVR-001',
      category: 'Liquid',
      cost_price: 25000,
      selling_price: 45000,
      description: 'Liquid vape rasa vanilla standar 60ml',
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'Liquid Vape Premium Strawberry',
      sku: 'LVP-002',
      category: 'Liquid',
      cost_price: 35000,
      selling_price: 65000,
      description: 'Liquid vape premium rasa strawberry 60ml',
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'Device Vape Starter Kit',
      sku: 'DVS-001',
      category: 'Device',
      cost_price: 150000,
      selling_price: 275000,
      description: 'Device vape starter kit untuk pemula',
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'Coil Replacement Pack',
      sku: 'CRP-001',
      category: 'Accessories',
      cost_price: 30000,
      selling_price: 55000,
      description: 'Paket pengganti coil isi 5 pcs',
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'Liquid Vape Double Menthol',
      sku: 'LVD-003',
      category: 'Liquid',
      cost_price: 28000,
      selling_price: 50000,
      description: 'Liquid vape rasa menthol dobel 60ml',
      is_active: true,
    },
  ],
  members: [
    {
      id: uuidv4(),
      member_number: 'MEMBER001',
      name: 'Budi Santoso',
      phone: '085123456789',
      email: 'budi@email.com',
      credit_balance: 500000,
      total_spent: 1200000,
      is_active: true,
    },
    {
      id: uuidv4(),
      member_number: 'MEMBER002',
      name: 'Siti Nurhaliza',
      phone: '085987654321',
      email: 'siti@email.com',
      credit_balance: 300000,
      total_spent: 850000,
      is_active: true,
    },
    {
      id: uuidv4(),
      member_number: 'MEMBER003',
      name: 'Ahmad Wijaya',
      phone: '085555666777',
      email: 'ahmad@email.com',
      credit_balance: 100000,
      total_spent: 500000,
      is_active: true,
    },
  ],
};

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Seed database with initial data
 */
export async function seedDatabase(): Promise<void> {
  try {
    await db.initialize();

    logger.info('Starting database seeding...');

    // Use transaction to ensure consistency
    await db.transaction(async (client) => {
      // 1. Insert stores
      logger.info('Seeding stores...');
      for (const store of seedData.stores) {
        await client.query(
          `INSERT INTO stores (id, name, address, phone, operating_hours, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [store.id, store.name, store.address, store.phone, JSON.stringify(store.operating_hours), store.is_active]
        );
      }

      // 2. Insert users
      logger.info('Seeding users...');
      for (let i = 0; i < seedData.users.length; i++) {
        const user = seedData.users[i];
        const password = i === 0 ? 'owner123' : `kasir${i}`;
        const hashedPassword = await hashPassword(password);
        const storeId = i === 0 ? null : seedData.stores[i - 1].id;

        logger.info(`Creating user: ${user.username} (password: ${password})`);

        await client.query(
          `INSERT INTO users (id, username, email, password_hash, role, store_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.id, user.username, user.email, hashedPassword, user.role, storeId, user.is_active]
        );
      }

      // 3. Insert products
      logger.info('Seeding products...');
      for (const product of seedData.products) {
        await client.query(
          `INSERT INTO products (id, name, sku, category, cost_price, selling_price, description, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            product.id,
            product.name,
            product.sku,
            product.category,
            product.cost_price,
            product.selling_price,
            product.description,
            product.is_active,
          ]
        );
      }

      // 4. Insert inventory for each store
      logger.info('Seeding inventory...');
      for (const store of seedData.stores) {
        for (const product of seedData.products) {
          await client.query(
            `INSERT INTO inventory (id, product_id, store_id, quantity, reserved, reorder_level)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), product.id, store.id, Math.floor(Math.random() * 50) + 10, 0, 5]
          );
        }
      }

      // 5. Insert members
      logger.info('Seeding members...');
      for (const member of seedData.members) {
        await client.query(
          `INSERT INTO members (id, member_number, name, phone, email, credit_balance, total_spent, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            member.id,
            member.member_number,
            member.name,
            member.phone,
            member.email,
            member.credit_balance,
            member.total_spent,
            member.is_active,
          ]
        );
      }

      // 6. Insert BOP for each store
      logger.info('Seeding BOP...');
      for (const store of seedData.stores) {
        const bopItems = [
          {
            name: 'Listrik',
            amount: 500000,
          },
          {
            name: 'Air',
            amount: 100000,
          },
          {
            name: 'Internet',
            amount: 150000,
          },
        ];

        for (const bop of bopItems) {
          await client.query(
            `INSERT INTO bop (id, store_id, name, amount, effective_from)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), store.id, bop.name, bop.amount, new Date().toISOString().split('T')[0]]
          );
        }
      }

      // 7. Insert suppliers
      logger.info('Seeding suppliers...');
      const suppliers = [
        {
          id: uuidv4(),
          name: 'PT Vape Distributor Indonesia',
          phone: '021-5555555',
          email: 'supplier@vape.com',
          address: 'Jl. Veteran, Jakarta',
          is_active: true,
        },
        {
          id: uuidv4(),
          name: 'CV Liquid Nusantara',
          phone: '021-6666666',
          email: 'supplier2@liquid.com',
          address: 'Jl. Gatot Subroto, Jakarta',
          is_active: true,
        },
      ];

      for (const supplier of suppliers) {
        await client.query(
          `INSERT INTO suppliers (id, name, phone, email, address, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [supplier.id, supplier.name, supplier.phone, supplier.email, supplier.address, supplier.is_active]
        );
      }
    });

    logger.info('✅ Database seeding completed successfully!');
    logger.info('');
    logger.info('Test Credentials:');
    logger.info('  Owner:  username=owner1, password=owner123');
    logger.info('  Kasir1: username=kasir1, password=kasir1');
    logger.info('  Kasir2: username=kasir2, password=kasir2');
    logger.info('');
  } catch (error) {
    logger.error('Database seeding failed', error as Error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run seeding if called directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch((error) => {
    logger.error('Seeding failed', error);
    process.exit(1);
  });
}
