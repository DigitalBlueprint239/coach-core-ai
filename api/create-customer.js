const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, metadata } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        userId: req.headers['x-user-id'] || 'anonymous',
      },
    });

    res.status(200).json({
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
}
