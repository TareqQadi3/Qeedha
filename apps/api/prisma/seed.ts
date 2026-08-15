import { PrismaClient, MerchantUserRole, MerchantStatus, PlatformStaffRole, WalletStatus, ApplicationStatus, FinancingPlan } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@qeedha.sa';
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'AdminPass123!';
  const existing = await prisma.platformStaff.findUnique({ where: { email } });
  if (!existing) {
    await prisma.platformStaff.create({
      data: {
        email,
        passwordHash: hashSync(password, 10),
        role: PlatformStaffRole.SUPER_ADMIN,
        status: 'ACTIVE',
      },
    });
    console.log(`Created admin: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  const merchantName = 'بقالة قيّدها التجريبية';
  let merchant = await prisma.merchant.findFirst({ where: { name: merchantName } });
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: merchantName,
        crNumber: '1010000000',
        ibanEncrypted: 'SA0380000000608010167519',
        status: MerchantStatus.ACTIVE,
      },
    });
    console.log(`Created merchant: ${merchant.id}`);
  } else {
    console.log(`Merchant already exists: ${merchant.id}`);
  }

  let cashier = await prisma.merchantUser.findFirst({ where: { merchantId: merchant.id, role: MerchantUserRole.CASHIER } });
  if (!cashier) {
    cashier = await prisma.merchantUser.create({
      data: {
        merchantId: merchant.id,
        fullName: 'كاشير التجربة',
        phone: '+96650000009',
        passwordHash: hashSync('Cashier123!', 10),
        role: MerchantUserRole.CASHIER,
        status: 'ACTIVE',
      },
    });
    console.log(`Created cashier: ${cashier.id} / +96650000009 / Cashier123!`);
  } else {
    console.log(`Cashier already exists: ${cashier.id}`);
  }

  const customerPhone = '+96650000001';
  let customer = await prisma.customer.findUnique({ where: { phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { phone: customerPhone, fullName: 'عميل تجريبي', status: 'ACTIVE' },
    });
    console.log(`Created customer: ${customer.id}`);
  } else {
    console.log(`Customer already exists: ${customer.id}`);
  }

  let provider = await prisma.financingProvider.findUnique({ where: { adapterKey: 'manual' } });
  if (!provider) {
    provider = await prisma.financingProvider.create({
      data: { name: 'Manual Provider', adapterKey: 'manual', config: {} },
    });
  }

  let application = await prisma.financingApplication.findFirst({
    where: { customerId: customer.id, merchantId: merchant.id, status: ApplicationStatus.APPROVED },
  });
  if (!application) {
    application = await prisma.financingApplication.create({
      data: {
        customerId: customer.id,
        merchantId: merchant.id,
        providerId: provider.id,
        amount: 1000,
        planType: FinancingPlan.PAY_IN_30,
        status: ApplicationStatus.APPROVED,
        decidedAt: new Date(),
      },
    });
  }

  let wallet = await prisma.wallet.findFirst({ where: { customerId: customer.id, status: WalletStatus.ACTIVE } });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        customerId: customer.id,
        merchantId: merchant.id,
        applicationId: application.id,
        totalAmount: 1000,
        remainingAmount: 500,
        status: WalletStatus.ACTIVE,
      },
    });
    console.log(`Created wallet: ${wallet.id} balance=500`);
  } else {
    console.log(`Wallet already exists: ${wallet.id} balance=${wallet.remainingAmount}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });