const express = require('express');
const Product = require('../models/Product');

const router = express.Router();
const { getChannel } = require('../utils/rabbitmq');

// GET /products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      console.log('Message sent to RabbitMQ:', savedProduct.sku);
    } else {
      console.log('RabbitMQ channel not available');
    }

    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /products/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;