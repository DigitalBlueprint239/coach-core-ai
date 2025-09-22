const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { subscriptionService } = require('../src/services/payments/subscription-service');

// Webhook endpoint for Stripe events
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle checkout session completed
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  // Create subscription record
  await subscriptionService.createSubscription({
    userId: session.metadata.userId,
    customerId: session.customer,
    subscriptionId: subscription.id,
    tier: getTierFromPriceId(subscription.items.data[0].price.id),
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
  });
}

// Handle subscription created
async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  // Update subscription record
  await subscriptionService.updateSubscription(subscription.id, {
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
  });
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  // Update subscription record
  await subscriptionService.updateSubscription(subscription.id, {
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
  });
}

// Handle subscription deleted
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  // Update subscription record
  await subscriptionService.updateSubscription(subscription.id, {
    status: 'canceled',
    canceledAt: new Date(),
    cancelAtPeriodEnd: true,
  });
}

// Handle payment succeeded
async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded:', invoice.id);
  
  // Update subscription status
  if (invoice.subscription) {
    await subscriptionService.updateSubscription(invoice.subscription, {
      status: 'active',
    });
  }
}

// Handle payment failed
async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id);
  
  // Update subscription status
  if (invoice.subscription) {
    await subscriptionService.updateSubscription(invoice.subscription, {
      status: 'past_due',
    });
  }
}

// Get tier from price ID
function getTierFromPriceId(priceId) {
  const priceMap = {
    'price_pro_monthly': 'PRO',
    'price_enterprise_monthly': 'ENTERPRISE',
  };
  
  return priceMap[priceId] || 'FREE';
}
