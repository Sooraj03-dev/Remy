// server/src/db/seedChats.ts
// Seeds realistic sample chat threads, pre-purchase inquiries, and active order messages
// for all active student accounts (e.g. Sooraj and Sreelakshmi).

import 'dotenv/config';
import { getDb } from '../config/db';
import { users, products, orders, messages } from './schema';
import { eq, or, and } from 'drizzle-orm';

type UserRow = typeof users.$inferSelect;
type ProductRow = typeof products.$inferSelect;

async function seedChats() {
  console.log('🌱 [seedChats] Starting sample chat data generation for all active students...');
  const db = getDb();

  // 1. Fetch all users from database
  const allUsers: UserRow[] = await db.select().from(users);
  if (allUsers.length === 0) {
    console.error('❌ No users found in database. Please run initial user sync first.');
    return;
  }

  // Identify target real student users (exclude mock/test accounts)
  let targetUsers = allUsers.filter((u: UserRow) => !u.email.includes('+clerk_test'));
  if (targetUsers.length === 0) {
    console.log('⚠️ No non-test users found, using first two users in db.');
    targetUsers = allUsers.slice(0, 2);
  }

  console.log(
    `👥 Target student users to seed chats for (${targetUsers.length}):\n` +
      targetUsers.map((u: UserRow) => `   - "${u.fullName}" (${u.email}, ID: ${u.id})`).join('\n')
  );

  // Other campus students for interactions
  const rohan = allUsers.find((u: UserRow) => u.fullName.includes('Rohan')) || allUsers[1 % allUsers.length];
  const diya = allUsers.find((u: UserRow) => u.fullName.includes('Diya')) || allUsers[2 % allUsers.length];
  const aarav = allUsers.find((u: UserRow) => u.fullName.includes('Aarav')) || allUsers[3 % allUsers.length];
  const fatima = allUsers.find((u: UserRow) => u.fullName.includes('Fatima')) || allUsers[4 % allUsers.length];
  const vikram = allUsers.find((u: UserRow) => u.fullName.includes('Vikram')) || allUsers[5 % allUsers.length];
  const sneha = allUsers.find((u: UserRow) => u.fullName.includes('Sneha')) || allUsers[6 % allUsers.length];

  // 2. Fetch existing products
  const allProducts: ProductRow[] = await db.select().from(products);
  console.log(`📦 Found ${allProducts.length} products in database.`);

  const calcProduct =
    allProducts.find((p: ProductRow) => p.title.toLowerCase().includes('calculator') || p.title.toLowerCase().includes('casio')) ||
    allProducts[0];

  const bioProduct =
    allProducts.find((p: ProductRow) => p.title.toLowerCase().includes('biology') || p.title.toLowerCase().includes('campbell')) ||
    allProducts[1 % allProducts.length];

  const audioProduct =
    allProducts.find((p: ProductRow) => p.title.toLowerCase().includes('headphones') || p.title.toLowerCase().includes('boat')) ||
    allProducts[2 % allProducts.length];

  const cycleProduct =
    allProducts.find((p: ProductRow) => p.title.toLowerCase().includes('cycle') || p.title.toLowerCase().includes('hero')) ||
    allProducts[3 % allProducts.length];

  const lampProduct =
    allProducts.find((p: ProductRow) => p.title.toLowerCase().includes('lamp') || p.title.toLowerCase().includes('ikea')) ||
    allProducts[4 % allProducts.length];

  // Helper function to create/update order with messages
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
      await db.update(orders).set({ status: opts.status }).where(eq(orders.id, orderRecord.id));
    }

    // Delete previous messages for this specific order so re-running is clean and idempotent
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

    return orderRecord;
  }

  // 3. Seed threads for each target student
  for (const student of targetUsers) {
    const firstName = student.fullName.split(' ')[0] || student.fullName;
    console.log(`\n💬 Seeding conversation threads for "${student.fullName}" (ID: ${student.id})...`);

    // Ensure this student has at least one active product listing as seller
    let studentProduct = allProducts.find((p: ProductRow) => p.sellerId === student.id);
    if (!studentProduct) {
      console.log(`✨ Creating sample product listing for ${student.fullName}...`);
      const isSooraj = student.email.includes('sooraj') || firstName.toLowerCase().includes('sooraj');
      const [created] = await db
        .insert(products)
        .values({
          sellerId: student.id,
          title: isSooraj
            ? 'Apple AirPods Pro (2nd Gen) with MagSafe Case'
            : 'Sony WH-CH520 Wireless Bluetooth Headphones',
          description: isSooraj
            ? 'Active Noise Cancellation, Adaptive Audio, and Transparency mode. In pristine condition with original box, braided lightning cable, and all silicone ear tips.'
            : 'Super lightweight on-ear headphones with 50-hour battery life and multipoint Bluetooth connection. Barely used for 2 months, original USB-C cable included.',
          price: isSooraj ? '4800.00' : '1850.00',
          category: 'electronics',
          condition: 'like_new',
          status: 'available',
          images: isSooraj
            ? [
                'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80',
              ]
            : [
                'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
              ],
          campusLocation: 'Central Library / North Campus',
          aiVerified: true,
        })
        .returning();
      studentProduct = created;
      if (studentProduct) {
        console.log(`✅ Created listing: "${studentProduct.title}" (ID: ${studentProduct.id})`);
      }
    }

    // Thread 1: Inquiring about Casio Calculator from Rohan (1 UNREAD message from Rohan)
    if (calcProduct) {
      await createConversationThread({
        productId: calcProduct.id,
        buyerId: student.id,
        sellerId: rohan.id,
        status: 'inquiry',
        amount: calcProduct.price || '700.00',
        messagesList: [
          {
            senderId: student.id,
            receiverId: rohan.id,
            content: 'Hi Rohan! Is the Casio scientific calculator still available? Does it come with the sliding hard case?',
            read: true,
            minutesAgo: 180,
          },
          {
            senderId: rohan.id,
            receiverId: student.id,
            content: `Hey ${firstName}! Yes, it includes the hard slide cover. Solar panel and battery are both working perfectly.`,
            read: true,
            minutesAgo: 120,
          },
          {
            senderId: student.id,
            receiverId: rohan.id,
            content: 'Awesome! Can we meet at the Central Library entrance around 4:30 PM today?',
            read: true,
            minutesAgo: 60,
          },
          {
            senderId: rohan.id,
            receiverId: student.id,
            content: '4:30 PM at the library entrance works for me! See you then 👍',
            read: false, // UNREAD MESSAGE from seller!
            minutesAgo: 15,
          },
        ],
      });
      console.log('  ✓ Thread 1: Casio Scientific Calculator (Rohan Verma - 1 unread)');
    }

    // Thread 2: Placed Order for Campbell Biology with Diya Nair (all read, meetup agreed)
    if (bioProduct) {
      await createConversationThread({
        productId: bioProduct.id,
        buyerId: student.id,
        sellerId: diya.id,
        status: 'placed',
        amount: bioProduct.price || '1200.00',
        messagesList: [
          {
            senderId: student.id,
            receiverId: diya.id,
            content: 'Hi Diya! Are there any highlighted sections or loose pages in the Campbell Biology book?',
            read: true,
            minutesAgo: 1440, // 1 day ago
          },
          {
            senderId: diya.id,
            receiverId: student.id,
            content: `Hi ${firstName}! No loose pages at all. A few neat pencil notes in the Genetics chapter, but otherwise like new.`,
            read: true,
            minutesAgo: 1380,
          },
          {
            senderId: student.id,
            receiverId: diya.id,
            content: 'Sounds good! Would you accept ₹1000 for a quick pickup today?',
            read: true,
            minutesAgo: 1200,
          },
          {
            senderId: diya.id,
            receiverId: student.id,
            content: 'Sure! ₹1000 works. Let’s meet outside Ramanujan Hostel around 5 PM.',
            read: true,
            minutesAgo: 900,
          },
          {
            senderId: student.id,
            receiverId: diya.id,
            content: 'Deal! I will ping you as soon as my lab finishes.',
            read: true,
            minutesAgo: 600,
          },
        ],
      });
      console.log('  ✓ Thread 2: Campbell Biology (Diya Nair - placed)');
    }

    // Thread 3: Incoming Buyer Inquiry on student's own listing (Aarav inquiring) (1 UNREAD message from Aarav)
    if (studentProduct) {
      await createConversationThread({
        productId: studentProduct.id,
        buyerId: aarav.id,
        sellerId: student.id,
        status: 'inquiry',
        amount: studentProduct.price || '1850.00',
        messagesList: [
          {
            senderId: aarav.id,
            receiverId: student.id,
            content: `Hi ${firstName}! Interested in your listing for ${studentProduct.title.split(' ')[0]}. How is the condition and battery health?`,
            read: true,
            minutesAgo: 45,
          },
          {
            senderId: student.id,
            receiverId: aarav.id,
            content: 'Hey Aarav! Battery life is top notch, easily lasts days. Condition is pristine, barely used.',
            read: true,
            minutesAgo: 25,
          },
          {
            senderId: aarav.id,
            receiverId: student.id,
            content: 'Sounds awesome! Can we meet at the Student Center Cafe tomorrow afternoon to test them out?',
            read: false, // UNREAD incoming message from buyer!
            minutesAgo: 8,
          },
        ],
      });
      console.log('  ✓ Thread 3: Incoming Buyer Inquiry from Aarav Sharma (1 unread)');
    }

    // Thread 4: Inquiry on Mountain Cycle with Vikram (1 UNREAD message from Vikram)
    if (cycleProduct) {
      await createConversationThread({
        productId: cycleProduct.id,
        buyerId: student.id,
        sellerId: vikram.id,
        status: 'inquiry',
        amount: cycleProduct.price || '4200.00',
        messagesList: [
          {
            senderId: student.id,
            receiverId: vikram.id,
            content: 'Hi Vikram! Is the Hero mountain cycle still available? Are the gears shifting smoothly?',
            read: true,
            minutesAgo: 320,
          },
          {
            senderId: vikram.id,
            receiverId: student.id,
            content: `Hey ${firstName}! Yes, 21-speed Shimano gears shift cleanly. Front suspension and disc brakes were tuned last week.`,
            read: true,
            minutesAgo: 240,
          },
          {
            senderId: student.id,
            receiverId: vikram.id,
            content: 'Great! Does it come with a wire lock and bell?',
            read: true,
            minutesAgo: 90,
          },
          {
            senderId: vikram.id,
            receiverId: student.id,
            content: 'Yes, heavy-duty wire lock with key and bell are included! Free for a quick test ride near the basketball court around 5 PM?',
            read: false, // UNREAD incoming message!
            minutesAgo: 12,
          },
        ],
      });
      console.log('  ✓ Thread 4: Hero Mountain Cycle (Vikram Joshi - 1 unread)');
    }

    // Thread 5: Confirmed Order for Study Lamp with Sneha Kulkarni
    if (lampProduct) {
      await createConversationThread({
        productId: lampProduct.id,
        buyerId: student.id,
        sellerId: sneha.id,
        status: 'confirmed',
        amount: lampProduct.price || '650.00',
        messagesList: [
          {
            senderId: student.id,
            receiverId: sneha.id,
            content: 'Hey Sneha! Does the study lamp have warm white or cool white light?',
            read: true,
            minutesAgo: 1400,
          },
          {
            senderId: sneha.id,
            receiverId: student.id,
            content: `Hi ${firstName}! It has 3 color modes (warm, neutral, cool) and 5 brightness levels with touch control.`,
            read: true,
            minutesAgo: 1350,
          },
          {
            senderId: student.id,
            receiverId: sneha.id,
            content: 'Awesome! Can I pick it up tomorrow morning?',
            read: true,
            minutesAgo: 1200,
          },
          {
            senderId: sneha.id,
            receiverId: student.id,
            content: 'Sure! Confirmed for 10 AM at Kaveri Hostel reception desk.',
            read: true,
            minutesAgo: 1100,
          },
        ],
      });
      console.log('  ✓ Thread 5: IKEA Study Lamp (Sneha Kulkarni - confirmed)');
    }

    // Thread 6: Completed purchase with Fatima Sheikh
    if (audioProduct && audioProduct.id !== studentProduct?.id) {
      await createConversationThread({
        productId: audioProduct.id,
        buyerId: student.id,
        sellerId: fatima.id,
        status: 'completed',
        amount: audioProduct.price || '850.00',
        messagesList: [
          {
            senderId: student.id,
            receiverId: fatima.id,
            content: 'Hey Fatima, is this still available for campus pickup?',
            read: true,
            minutesAgo: 2880, // 2 days ago
          },
          {
            senderId: fatima.id,
            receiverId: student.id,
            content: `Yes ${firstName}, still available! Original aux and charging cables are included.`,
            read: true,
            minutesAgo: 2800,
          },
          {
            senderId: student.id,
            receiverId: fatima.id,
            content: 'Picked it up from you at the sports arena earlier. Sound is fantastic, thank you so much!',
            read: true,
            minutesAgo: 1440,
          },
          {
            senderId: fatima.id,
            receiverId: student.id,
            content: 'You’re most welcome! Enjoy the music and have a wonderful semester 🎉',
            read: true,
            minutesAgo: 1400,
          },
        ],
      });
      console.log('  ✓ Thread 6: boAt Rockerz Headphones (Fatima Sheikh - completed)');
    }
  }

  console.log('\n🎉 [seedChats] All chat conversations seeded successfully for all active students!');
}

seedChats().catch((err) => {
  console.error('❌ [seedChats error]', err);
  process.exit(1);
});
