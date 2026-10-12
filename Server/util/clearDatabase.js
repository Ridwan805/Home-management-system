const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.log('DNS fallback setting skipped:', e.message);
}

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ MongoDB connection string not found in .env');
  process.exit(1);
}

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`, collections.map(c => c.name));

    // Clear all collections except 'admins'
    for (const col of collections) {
      if (col.name.toLowerCase() !== 'admins') {
        const result = await db.collection(col.name).deleteMany({});
        console.log(`Cleared collection [${col.name}]: deleted ${result.deletedCount} documents.`);
      }
    }

    // Reset admins collection to exactly 1 admin account
    const adminsCollection = db.collection('admins');
    await adminsCollection.deleteMany({});

    const adminEmail = 'admin@dwell.com';
    const adminPassword = 'admin12345';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await adminsCollection.insertOne({
      email: adminEmail,
      hashedPassword: hashedPassword,
      role: 'admin',
      isActive: true,
      permissions: ['manage_users', 'manage_properties', 'handle_reports', 'all_user_functions'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`\n✅ Database cleared successfully!`);
    console.log(`✅ Seeded 1 admin user:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);

    // Print summary of counts
    console.log('\n--- Final Collection Document Counts ---');
    const updatedCollections = await db.listCollections().toArray();
    for (const col of updatedCollections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - ${col.name}: ${count} document(s)`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB. Done.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
