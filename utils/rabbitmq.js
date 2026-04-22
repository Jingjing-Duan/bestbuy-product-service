const amqp = require('amqplib');

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue('product.created', { durable: true });    

    console.log('RabbitMQ connected');
  } catch (error) {
    console.error('RabbitMQ connection error:', error.message);
  }
}

function getChannel() {
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };