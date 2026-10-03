require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Admin = require('../models/Admin');

const PLACEHOLDER_BLOUSE = 'https://placehold.co/600x800/C4704A/FAF7F2?text=Aari+Blouse';
const PLACEHOLDER_PC = 'https://placehold.co/600x600/6B7A5E/FAF7F2?text=Pipe+Cleaner+Art';

const products = [
  // ── BLOUSES ────────────────────────────────────────────────────────────────
  {
    name: 'Royal Peacock Aari Blouse',
    description:
      'A breathtaking hand-embroidered blouse featuring our signature peacock motif rendered in rich gold and teal thread work. Each piece is individually crafted with traditional Aari needle technique. Perfect for silk sarees and festive occasions.',
    price: 2800,
    category: 'blouse',
    images: [PLACEHOLDER_BLOUSE, PLACEHOLDER_BLOUSE],
    stock: 8,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom'],
    colors: ['Teal & Gold', 'Red & Gold', 'Navy & Silver'],
    isFeatured: true,
    isActive: true,
  },
  {
    name: 'Vintage Rose Garden Blouse',
    description:
      'Delicate rose vine embroidery cascades across the bodice and sleeves of this dreamy blouse. Hand-crafted using silk thread on soft georgette fabric. The intricate petals and leaves are worked stitch by stitch for a one-of-a-kind piece.',
    price: 2200,
    category: 'blouse',
    images: [PLACEHOLDER_BLOUSE],
    stock: 5,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom'],
    colors: ['Blush Pink & Ivory', 'Dusty Rose & Cream', 'Mauve & Gold'],
    isFeatured: true,
    isActive: true,
  },
  {
    name: 'Geometric Terracotta Blouse',
    description:
      'Bold geometric patterns inspired by ancient temple architecture adorn this statement piece. Heavy Aari work in terracotta, cream, and gold thread on raw silk fabric. A stunning choice for traditional ceremonies.',
    price: 3200,
    category: 'blouse',
    images: [PLACEHOLDER_BLOUSE],
    stock: 3,
    sizes: ['S', 'M', 'L', 'XL', 'Custom'],
    colors: ['Terracotta & Cream', 'Olive & Gold', 'Charcoal & Silver'],
    isFeatured: false,
    isActive: true,
  },
  {
    name: 'Minimalist Gold Vine Blouse',
    description:
      'Subtle elegance meets artisan craft in this minimalist design. Fine gold thread vines trail gracefully along the neckline and sleeves. Perfect for those who love understated luxury. Ideal for office parties and casual silk saree looks.',
    price: 1800,
    category: 'blouse',
    images: [PLACEHOLDER_BLOUSE],
    stock: 12,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'],
    colors: ['Ivory & Gold', 'Black & Gold', 'Cream & Silver'],
    isFeatured: false,
    isActive: true,
  },

  // ── PIPE CLEANER ART ────────────────────────────────────────────────────────
  {
    name: 'Pipe Cleaner Sunflower Bouquet',
    description:
      'A cheerful sunflower bouquet handcrafted entirely from pipe cleaners. Each petal and leaf is carefully shaped and layered for a lifelike look. Comes in a small ceramic pot — ready to brighten any desk or shelf. Never wilts!',
    price: 650,
    category: 'pipe-cleaner',
    images: [PLACEHOLDER_PC],
    stock: 15,
    sizes: [],
    colors: ['Yellow & Brown', 'Orange & Brown', 'Mixed Sunset'],
    isFeatured: true,
    isActive: true,
  },
  {
    name: 'Miniature Rose Garden Frame',
    description:
      'A framed wall art piece featuring a garden of pipe cleaner roses in full bloom. Handmade with precision, each rose is individually shaped with multiple petals. Shadow box frame included. A unique gift for home décor lovers.',
    price: 950,
    category: 'pipe-cleaner',
    images: [PLACEHOLDER_PC],
    stock: 8,
    sizes: [],
    colors: ['Red Roses', 'Pink Roses', 'Mixed Pastel', 'White & Cream'],
    isFeatured: true,
    isActive: true,
  },
  {
    name: 'Whimsical Butterfly Mobile',
    description:
      'A hanging mobile featuring 6 handcrafted pipe cleaner butterflies in a gradient of colors. Perfect for nurseries, windows, or as a playful room accent. Each butterfly has intricate wing patterns and delicate antennae.',
    price: 750,
    category: 'pipe-cleaner',
    images: [PLACEHOLDER_PC],
    stock: 10,
    sizes: [],
    colors: ['Rainbow', 'Pastel Blues', 'Earthy Tones', 'Purple & Pink'],
    isFeatured: false,
    isActive: true,
  },
  {
    name: 'Custom Name Letter Art',
    description:
      'Personalized name art made from pipe cleaners! Choose any name or word up to 8 characters. Each letter is carefully sculpted and can be decorated with tiny flowers, stars, or hearts. Comes mounted on a wooden base. Perfect for gifting.',
    price: 1100,
    category: 'pipe-cleaner',
    images: [PLACEHOLDER_PC],
    stock: 20,
    sizes: [],
    colors: ['Gold & Cream', 'Rainbow', 'Pink & White', 'Blue & Silver'],
    isFeatured: false,
    isActive: true,
  },
];

async function seed() {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany({});
    await Admin.deleteMany({});

    // Seed products
    await Product.insertMany(products);
    console.log(`✅ Seeded ${products.length} products (4 blouses + 4 pipe cleaner)`);

    // Seed admin
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    await Admin.create({
      email: process.env.ADMIN_EMAIL || 'admin@aariandflora.com',
      passwordHash,
      name: 'Aari & Flora Admin',
    });
    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL || 'admin@aariandflora.com'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);

    console.log('\n🌸 Seed complete! Your database is ready.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
