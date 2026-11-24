// server/src/db/seedChats.ts
// Seeds realistic sample chat threads, pre-purchase inquiries, and active order messages.

import 'dotenv/config';
import { getDb } from '../config/db';
import { users, products, orders, messages, notifications } from './schema';
import { eq, or, and, sql } from 'drizzle-orm';

async function seedChats() {
  console.log('🌱 [seedChats] Starting sample chat data generation...');
  const db = getDb();

  // 1. Locate primary user (Sreelakshmi Rajesh or first registered user)
  const allUsers = await db.select().from(users);
  if (allUsers.length === 0) {
    console.error('❌ No users found in database. Please run initial user sync first.');
    return;
  }

  const primaryUser =
    allUsers.find((u) => u.email === 'slr231006@gmail.com') ||
    allUsers.find((u) => u.fullName.toLowerCase().includes('sreelakshmi')) ||
    allUsers[0];

  console.log(`👤 Primary user: "${primaryUser.fullName}" (${primaryUser.email}, id: ${primaryUser.id})`);

  // Other campus students
  const rohan = allUsers.find((u) => u.fullName.includes('Rohan')) || allUsers[1 % allUsers.length];
  const diya = allUsers.find((u) => u.fullName.includes('Diya')) || allUsers[2 % allUsers.length];
  const aarav = allUsers.find((u) => u.fullName.includes('Aarav')) || allUsers[3 % allUsers.length];
  const fatima = allUsers.find((u) => u.fullName.includes('Fatima')) || allUsers[4 % allUsers.length];

  // 2. Fetch existing products
  const allProducts = await db.select().from(products);
  console.log(`📦 Found ${allProducts.length} products in database.`);

  const calcProduct =
    allProducts.find((p) => p.title.toLowerCase().includes('calculator') || p.title.toLowerCase().includes('casio')) ||
    allProducts[0];

  const bioProduct =
    allProducts.find((p) => p.title.toLowerCase().includes('biology') || p.title.toLowerCase().includes('campbell')) ||
    allProducts[1 % allProducts.length];

  const audioProduct =
    allProducts.find((p) => p.title.toLowerCase().includes('headphones') || p.title.toLowerCase().includes('boat')) ||
    allProducts[2 % allProducts.length];

  // 3. Ensure primary user has at least one active product listing
  let primaryUserProduct = allProducts.find((p) => p.sellerId === primaryUser.id);
  if (!primaryUserProduct) {
    console.log(`✨ Creating sample product listing for ${primaryUser.fullName}...`);
    const [created] = await db
      .insert(products)
      .values({
        sellerId: primaryUser.id,
        title: 'Sony WH-CH520 Wireless Bluetooth Headphones',
        description:
          'Super lightweight on-ear headphones with 50-hour battery life and multipoint Bluetooth connection. Barely used for 2 months, original USB-C cable included.',
        price: '1850.00',
        category: 'electronics',
        condition: 'like_new',
        status: 'available',
        images: ['https://picsum.photos/seed/sony-wh-headphones/800/800'],
        campusLocation: 'Central Library / North Campus',
        aiVerified: true,
      })
      .returning();
    primaryUserProduct = created;
    console.log(`✅ Created listing: "${primaryUserProduct.title}" (id: ${primaryUserProduct.id})`);
  }

  // 4. Clean up any existing sample test orders for this user to ensure idempotency
  // (Only remove orders matching our sample products or status inquiry/sample)
  const existingOrders = await db
    .select()
    .from(orders)
    .where(or(eq(orders.buyerId, primaryUser.id), eq(orders.sellerId, primaryUser.id)));

  console.log(`ℹ️ User currently has ${existingOrders.length} existing orders.`);

  // Function to create order with messages
  async function createConversationThread(opts: {
    productId: string;
    buyerId: string;
    sellerId: string;
    status: 'inquiry' | 'placed' | 'confirmed' | 'meetup_arranged' | 'completed';
    amount: string;
    messagesList: {
      senderId: string;
      receiverId: string;
      content: string;
      read: boolean;
      minutesAgo: number;
    }[];
  }) {
    // Check if an order already exists between these two for this product
    let [orderRecord] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.productId, opts.productId),
          eq(orders.buyerId, opts.buyerId),
          eq(orders.sellerId, opts.sellerId),
        ),
      );

    if (!orderRecord) {
      const [newOrder] = await db
        .insert(orders)
        .values({
          productId: opts.productId,
          buyerId: opts.buyerId,
          sellerId: opts.sellerId,
          status: opts.status,
          amount: opts.amount,
          meetupLocation: 'Campus Central Library Plaza',
          meetupTime: new Date(Date.now() + 86400000), // tomorrow
        })
        .returning();
      orderRecord = newOrder;
    } else {
      // Update status if needed
      await db.update(orders).set({ status: opts.status }).where(eq(orders.id, orderRecord.id));
    }

    // Delete previous messages for this specific order so we don't accumulate duplicates on re-run
    await db.delete(messages).where(eq(messages.orderId, orderRecord.id));

    // Insert messages with realistic timestamps
    for (const msg of opts.messagesList) {
      const createdAt = new Date(Date.now() - msg.minutesAgo * 60 * 1000);
      await db.insert(messages).values({
        orderId: orderRecord.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        read: msg.read,
        createdAt,
      });
    }

    console.log(`💬 Added thread for order ${orderRecord.id.slice(0, 8)} (${opts.status}) with ${opts.messagesList.length} messages.`);
    return orderRecord;
  }

  // Thread 1: Inquiring about Casio Calculator from Rohan (1 unread message from Rohan)
  if (calcProduct) {
    await createConversationThread({
      productId: calcProduct.id,
      buyerId: primaryUser.id,
      sellerId: rohan.id,
      status: 'inquiry',
      amount: calcProduct.price || '700.00',
      messagesList: [
        {
          senderId: primaryUser.id,
          receiverId: rohan.id,
          content: 'Hi Rohan! Is the Casio scientific calculator still available? Does it come with the sliding hard case?',
          read: true,
          minutesAgo: 180,
        },
        {
          senderId: rohan.id,
          receiverId: primaryUser.id,
          content: 'Hey Sreelakshmi! Yes, it includes the hard slide cover. Solar panel and battery are both working perfectly.',
          read: true,
          minutesAgo: 120,
        },
        {
          senderId: primaryUser.id,
          receiverId: rohan.id,
          content: 'Awesome! Can we meet at the Central Library entrance around 4:30 PM today?',
          read: true,
          minutesAgo: 60,
        },
        {
          senderId: rohan.id,
          receiverId: primaryUser.id,
          content: '4:30 PM at the library entrance works for me! See you then 👍',
          read: false, // Unread message from seller!
          minutesAgo: 15,
        },
      ],
    });
  }

  // Thread 2: Placed Order for Campbell Biology with Diya Nair (all read, meetup agreed)
  if (bioProduct) {
    await createConversationThread({
      productId: bioProduct.id,
      buyerId: primaryUser.id,
      sellerId: diya.id,
      status: 'placed',
      amount: bioProduct.price || '1000.00',
      messagesList: [
        {
          senderId: primaryUser.id,
          receiverId: diya.id,
          content: 'Hi Diya! Are there any highlighted sections or loose pages in the Campbell Biology book?',
          read: true,
          minutesAgo: 1440, // 1 day ago
        },
        {
          senderId: diya.id,
          receiverId: primaryUser.id,
          content: 'Hi Sreelakshmi! No loose pages at all. A few neat pencil notes in the Genetics chapter, but otherwise like new.',
          read: true,
          minutesAgo: 1380,
        },
        {
          senderId: primaryUser.id,
          receiverId: diya.id,
          content: 'Sounds good! Would you accept ₹1000 for a quick pickup today?',
          read: true,
          minutesAgo: 1200,
        },
        {
          senderId: diya.id,
          receiverId: primaryUser.id,
          content: 'Sure! ₹1000 works. Let’s meet outside Ramanujan Hostel around 5 PM.',
          read: true,
          minutesAgo: 900,
        },
        {
          senderId: primaryUser.id,
          receiverId: diya.id,
          content: 'Deal! I will ping you as soon as my lab finishes.',
          read: true,
          minutesAgo: 600,
        },
      ],
    });
  }

  // Thread 3: Incoming Buyer Inquiry on Sreelakshmi's listing (Aarav inquiring about Sony headphones)
  if (primaryUserProduct) {
    await createConversationThread({
      productId: primaryUserProduct.id,
      buyerId: aarav.id,
      sellerId: primaryUser.id,
      status: 'inquiry',
      amount: primaryUserProduct.price || '1850.00',
      messagesList: [
        {
          senderId: aarav.id,
          receiverId: primaryUser.id,
          content: 'Hi Sreelakshmi! Interested in the Sony headphones. How is the battery health and sound quality?',
          read: true,
          minutesAgo: 45,
        },
        {
          senderId: primaryUser.id,
          receiverId: aarav.id,
          content: 'Hey Aarav! Battery easily lasts 40+ hours on a single charge. Sound is punchy and crisp with custom EQ in the Sony app.',
          read: true,
          minutesAgo: 25,
        },
        {
          senderId: aarav.id,
          receiverId: primaryUser.id,
          content: 'Sounds awesome! Can we meet at the Student Center Cafe tomorrow afternoon to test them out?',
          read: false, // Unread incoming message from buyer!
          minutesAgo: 8,
        },
      ],
    });
  }

  // Thread 4: Completed purchase with Fatima Sheikh
  if (audioProduct && audioProduct.id !== primaryUserProduct?.id) {
    await createConversationThread({
      productId: audioProduct.id,
      buyerId: primaryUser.id,
      sellerId: fatima.id,
      status: 'completed',
      amount: audioProduct.price || '850.00',
      messagesList: [
        {
          senderId: primaryUser.id,
          receiverId: fatima.id,
          content: 'Hey Fatima, is this still available for campus pickup?',
          read: true,
          minutesAgo: 2880, // 2 days ago
        },
        {
          senderId: fatima.id,
          receiverId: primaryUser.id,
          content: 'Yes Sreelakshmi, still available! Original aux and charging cables are included.',
          read: true,
          minutesAgo: 2800,
        },
        {
          senderId: primaryUser.id,
          receiverId: fatima.id,
          content: 'Picked it up from you at the sports arena earlier. Sound is fantastic, thank you so much!',
          read: true,
          minutesAgo: 1440,
        },
        {
          senderId: fatima.id,
          receiverId: primaryUser.id,
          content: 'You’re most welcome! Enjoy the music and have a wonderful semester 🎉',
          read: true,
          minutesAgo: 1400,
        },
      ],
    });
  }

  console.log('🎉 [seedChats] Sample chat conversations seeded successfully!');
}

seedChats().catch((err) => {
  console.error('❌ [seedChats error]', err);
  process.exit(1);
});
