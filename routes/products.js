const express = require('express');
const Product = require('../models/Product');
const { getChannel } = require('../utils/rabbitmq');

const router = express.Router();

// GET /products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products' });
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load product' });
  }
});

// POST /products
router.post('/', async (req, res) => {
  try {
    const { sku, name, description, price, category, image, stock } = req.body;

    const product = new Product({
      sku,
      name,
      description,
      price,
      category,
      image,
      stock
    });

    const savedProduct = await product.save();

    const channel = getChannel();
    if (channel) {
      channel.sendToQueue(
        'product.created',
        Buffer.from(JSON.stringify(savedProduct)),
        { persistent: true }
      );
      console.log('✅ Message sent to RabbitMQ:', savedProduct.sku);
    } else {
      console.log('⚠️ RabbitMQ channel not available');
    }

    return res.status(201).json(savedProduct);
  } catch (error) {
    console.error('❌ Error creating product:', error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'SKU already exists'
      });
    }

    return res.status(500).json({
      message: error.message || 'Failed to create product'
    });
  }
});

// PUT /products/:id
router.put('/:id', async (req, res) => {
  try {
    const { sku, name, description, price, category, image, stock } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        sku,
        name,
        description,
        price,
        category,
        image,
        stock
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(updatedProduct);
  } catch (error) {
    console.error('❌ Error updating product:', error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'SKU already exists'
      });
    }

    return res.status(400).json({
      message: error.message || 'Failed to update product'
    });
  }
});

// DELETE /products/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting product:', error.message);

    return res.status(500).json({
      message: error.message || 'Failed to delete product'
    });
  }
});

module.exports = router;