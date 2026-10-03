const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

// POST /api/orders — place a new order
router.post('/', async (req, res) => {
  try {
    const { customer, items, deliveryCharge = 0, notes } = req.body;

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: 'Customer info and items are required.' });
    }

    // Validate and enrich items from DB
    const enrichedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for: ${product.name}` });
      }

      const linePrice = product.price * item.quantity;
      subtotal += linePrice;

      enrichedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize || null,
        selectedColor: item.selectedColor || null,
        image: product.images[0] || null,
      });

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    const totalAmount = subtotal + deliveryCharge;

    const order = new Order({
      customer,
      items: enrichedItems,
      subtotal,
      deliveryCharge,
      totalAmount,
      notes,
      statusHistory: [{ status: 'pending', updatedAt: new Date() }],
    });

    await order.save();

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      _id: order._id,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/orders/track?orderId=AAF-XXXX or ?phone=XXXXXXXXXX
router.get('/track', async (req, res) => {
  try {
    const { orderId, phone } = req.query;

    if (!orderId && !phone) {
      return res.status(400).json({ message: 'Provide orderId or phone number to track.' });
    }

    let query = {};
    if (orderId) query.orderId = orderId.toUpperCase();
    if (phone) query['customer.phone'] = phone;

    const orders = await Order.find(query)
      .select('orderId status customer.name customer.phone items totalAmount createdAt statusHistory')
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({ message: 'No orders found.' });
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
