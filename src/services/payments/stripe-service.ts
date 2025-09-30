import Stripe from 'stripe';

type StripeConfig = {
  apiKey?: string;
  webhookSecret?: string;
  apiVersion?: Stripe.LatestApiVersion;
};

type CustomerUpdate = Stripe.CustomerUpdateParams;
type CheckoutOptions = Stripe.Checkout.SessionCreateParams;

type WebhookHandler = (event: Stripe.Event) => Promise<void> | void;

type WebhookHandlers = {
  onCheckoutCompleted?: WebhookHandler;
  onSubscriptionUpdated?: WebhookHandler;
  onSubscriptionDeleted?: WebhookHandler;
  onInvoicePaymentFailed?: WebhookHandler;
  onUnhandledEvent?: WebhookHandler;
};

const DEFAULT_API_VERSION: Stripe.LatestApiVersion = '2023-10-16';

const ensureServerEnvironment = () => {
  if (typeof window !== 'undefined') {
    throw new Error('StripeService must be instantiated in a server-side environment.');
  }
};

const resolveEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof import !== 'undefined' && (import.meta as any)?.env) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;
  private handlers: WebhookHandlers;

  constructor(config: StripeConfig = {}, handlers: WebhookHandlers = {}) {
    ensureServerEnvironment();

    const apiKey =
      config.apiKey ||
      resolveEnv('STRIPE_SECRET_KEY') ||
      resolveEnv('VITE_STRIPE_SECRET_KEY');

    if (!apiKey) {
      throw new Error('Stripe secret key is not configured');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    });

    this.webhookSecret =
      config.webhookSecret ||
      resolveEnv('STRIPE_WEBHOOK_SECRET') ||
      resolveEnv('VITE_STRIPE_WEBHOOK_SECRET') ||
      '';

    if (!this.webhookSecret) {
      console.warn('[stripe] Webhook secret not configured; webhook verification will be skipped.');
    }

    this.handlers = handlers;
  }

  // Customer Management -----------------------------------------------------

  async createCustomer(userId: string, email: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async updateCustomer(customerId: string, updates: CustomerUpdate): Promise<void> {
    await this.stripe.customers.update(customerId, updates);
  }

  // Subscription Management -------------------------------------------------

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription.items.data.length) {
      throw new Error('Subscription has no items to update');
    }

    const [item] = subscription.items.data;

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: item.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean): Promise<void> {
    if (immediately) {
      await this.stripe.subscriptions.del(subscriptionId);
      return;
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Payment Methods ---------------------------------------------------------

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
  }

  // Checkout Sessions -------------------------------------------------------

  async createCheckoutSession(options: CheckoutOptions): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create(options);
  }

  async createPortalSession(customerId: string): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
    });
  }

  // Webhook Processing ------------------------------------------------------

  async handleWebhook(payload: string, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      if (!this.webhookSecret) {
        console.warn('[stripe] Webhook secret missing; skipping verification');
        event = JSON.parse(payload) as Stripe.Event;
      } else {
        event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      }
    } catch (error) {
      console.error('[stripe] Failed to verify webhook signature', error);
      throw error;
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handlers.onCheckoutCompleted?.(event);
        break;
      case 'customer.subscription.updated':
        await this.handlers.onSubscriptionUpdated?.(event);
        break;
      case 'customer.subscription.deleted':
        await this.handlers.onSubscriptionDeleted?.(event);
        break;
      case 'invoice.payment_failed':
        await this.handlers.onInvoicePaymentFailed?.(event);
        break;
      default:
        await this.handlers.onUnhandledEvent?.(event);
        break;
    }
  }

  // Usage-Based Billing -----------------------------------------------------

  async reportUsage(subscriptionItemId: string, quantity: number): Promise<void> {
    await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      action: 'increment',
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }
}

export type { CheckoutOptions, CustomerUpdate };
