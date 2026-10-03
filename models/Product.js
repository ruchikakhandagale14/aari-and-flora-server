const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ['blouse', 'pipe-cleaner'],
    },
    images: [{ type: String }], // array of image filenames/URLs
    stock: { type: Number, default: 10, min: 0 },
    sizes: [{ type: String }], // only for blouses: ['XS','S','M','L','XL','Custom']
    colors: [{ type: String }], // e.g. ['Red', 'Blue', 'Green']
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
