const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── AUTH ──────────────────────────────────────────────────────────────────────

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required.' });

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials.' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, name: admin.name, email: admin.email });
  } catch (err) {
    console.error('ADMIN LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// All routes below require auth
router.use(authMiddleware);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const revenue = revenueResult[0]?.total || 0;

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderId customer.name totalAmount status createdAt');

    res.json({
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenue,
      recentOrders,
    });
  } catch (err) {
    console.error('DASHBOARD ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── ORDERS ────────────────────────────────────────────────────────────────────

// GET /api/admin/orders?status=pending&search=John
router.get('/orders', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('GET ORDERS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product', 'name images');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    console.error('GET ORDER BY ID ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.status = status;
    if (note) {
      order.statusHistory[order.statusHistory.length - 1].note = note;
    }
    await order.save();

    res.json({ message: 'Status updated.', status: order.status });
  } catch (err) {
    console.error('UPDATE ORDER STATUS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

// GET /api/admin/products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('GET PRODUCTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/products — with image upload
router.post('/products', (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      console.error('MULTER UPLOAD ERROR (POST):', err);
      return res.status(400).json({ message: err.message || 'File upload error.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, description, price, category, stock, sizes, colors, isFeatured, isActive } =
      req.body;

    const images = req.files ? req.files.map((f) => f.path) : [];

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock) || 10,
      sizes: sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : [],
      colors: colors ? (Array.isArray(colors) ? colors : JSON.parse(colors)) : [],
      images,
      isFeatured: isFeatured === 'true',
      isActive: isActive !== 'false',
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('CREATE PRODUCT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      console.error('MULTER UPLOAD ERROR (PUT):', err);
      return res.status(400).json({ message: err.message || 'File upload error.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, description, price, category, stock, sizes, colors, isFeatured, isActive, existingImages } =
      req.body;

    const newImages = req.files ? req.files.map((f) => f.path) : [];
    const kept = existingImages
      ? Array.isArray(existingImages)
        ? existingImages
        : JSON.parse(existingImages)
      : [];
    const images = [...kept, ...newImages];

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
        sizes: sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : [],
        colors: colors ? (Array.isArray(colors) ? colors : JSON.parse(colors)) : [],
        images,
        isFeatured: isFeatured === 'true',
        isActive: isActive !== 'false',
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Product not found.' });
    res.json(updated);
  } catch (err) {
    console.error('PRODUCT UPDATE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    console.error('DELETE PRODUCT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

// GET /api/admin/customers
router.get('/customers', async (req, res) => {
  try {
    const customers = await Order.aggregate([
      {
        $group: {
          _id: '$customer.phone',
          name: { $last: '$customer.name' },
          phone: { $last: '$customer.phone' },
          email: { $last: '$customer.email' },
          city: { $last: '$customer.city' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
      { $sort: { lastOrderDate: -1 } },
    ]);
    res.json(customers);
  } catch (err) {
    console.error('GET CUSTOMERS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
