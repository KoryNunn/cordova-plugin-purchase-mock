const baseStore = global.store = {};
require('cordova-plugin-purchase/src/js/constants.js');
delete global.store;

function requiresImplementation(name) {
  return () => { throw new Error(`You must implement ${name}`) }
}

function createMockStore(options = {}, remoteProducts = {}) {
  options = {
    debug: false, // Print debug log output to the console
    onOrder: requiresImplementation('you must implement options.onOrder'),
    ...options
  };

  const context = {
    handlers: {},
    registeredProducts: {},
    loadedProducts: {}
  };

  function log(...args) {
    if (options.debug) {
      console.info(...args);
    }
  }

  function removeHandler(id, action, handler) {
    log(`off ${id} ...`);
    return {
      [action]: (handler) => {
        log(`  ${action} handler removed`);
        const index = context.handlers.products?.[id]?.[action]?.indexOf(handler);

        if(index >= 0) {
          context.handlers.products[id][action].splice(index, 1);
        }
      }
    }
  }

  function createHandlerMethod(id, action, once) {
    log(`when ${id} ...`);

    return {
      [action]: (handler) => {
        const originalHandler = handler;
        handler = once ? (...args) => {
          removeHandler(id, action, handler);
          originalHandler(...args);
        } : handler;

        log(`  ${action} handler added`);
        context.handlers.products ??= {};
        context.handlers.products[id] ??= {};
        context.handlers.products[id][action] ??= [];
        context.handlers.products[id][action].push(handler)
      }
    }
  }

  return {
    ...baseStore,

    context,
    when: (...args) => {
      if (args.length === 3) {
        const [id, action, callback] = args;
        createHandlerMethod(id, action)[action](callback);
        return;
      }

      const [id] = args;

      return {
        ...createHandlerMethod(id, 'approved'),
        ...createHandlerMethod(id, 'cancelled'),
        ...createHandlerMethod(id, 'loaded')
      }
    },
    once: (...args) => {
      if (args.length === 3) {
        const [id, action, callback] = args;
        createHandlerMethod(id, action, true)[action](callback);
        return;
      }

      const [id] = args;

      return {
        ...createHandlerMethod(id, 'approved', true),
        ...createHandlerMethod(id, 'cancelled', true),
        ...createHandlerMethod(id, 'loaded', true)
      }
    },
    order: async (id) => {
      log(`${id} ordered`);

      if(!context.loadedProducts[id]) {
        return;
      }

      context.loadedProducts[id].canPurchase = false;
      const transaction = await options.onOrder(context.loadedProducts[id]);
      context.loadedProducts[id].transaction = transaction;

      setTimeout(() => {
        if (transaction != null) {
          context.loadedProducts[id] && context.handlers.products?.[id]?.approved?.forEach(handler => handler(context.loadedProducts[id]));
        } else {
          context.loadedProducts[id] && context.handlers.products?.[id]?.cancelled?.forEach(handler => handler(context.loadedProducts[id]));
        }
      });
    },
    get: id => context.loadedProducts[id],
    register: async product => {
      log(`${product.id} registered`);
      context.registeredProducts[product.id] = product
    },
    refresh: () => Object.keys(context.registeredProducts).forEach(productId => {
      context.loadedProducts[productId] = {

        /*
        alias, // Alias that can be used for more explicit queries
        type, // Family of product, should be one of the defined product types.
        group, // Name of the group your subscription product is a member of (default to "default"). If you don't set anything, all subscription will be members of the same group.
        state, // Current state the product is in (see life-cycle below). Should be one of the defined product states
        title, // Localized name or short description
        description, // Localized longer description
        priceMicros, // Price in micro-units (divide by 1000000 to get numeric price)
        price, // Localized price, with currency symbol
        currency, // Currency code (optionaly)
        countryCode, // Country code. Available only on iOS
        deferred, // Purchase has been initiated but is waiting for external action (for example, Ask to Buy on iOS)
        introPrice, // Localized introductory price, with currency symbol
        introPriceMicros, // Introductory price in micro-units (divide by 1000000 to get numeric price)
        introPricePeriod, // Duration the introductory price is available (in period-unit)
        introPricePeriodUnit, // Period for the introductory price ("Day", "Week", "Month" or "Year")
        introPricePaymentMode, // Payment mode for the introductory price ("PayAsYouGo", "UpFront", or "FreeTrial")
        ineligibleForIntroPrice, // True when a trial or introductory price has been applied to a subscription. Only available after receipt validation. Available only on iOS
        discounts, // Array of discounts available for the product. Each discount exposes the following fields:
          id, // The discount identifier
          price, // Localized price, with currency symbol
          priceMicros, // Price in micro-units (divide by 1000000 to get numeric price)
          period, // Number of subscription periods
          periodUnit, // Unit of the subcription period ("Day", "Week", "Month" or "Year")
          paymentMode, // "PayAsYouGo", "UpFront", or "FreeTrial"
          eligible, // True if the user is deemed eligible for this discount by the platform
        downloading, // Product is downloading non-consumable content
        downloaded, // Non-consumable content has been successfully downloaded for this product
        additionalData, // Additional data possibly required for product purchase
        transaction, // Latest transaction data for this product (see transactions).
        offers, // List of offers available for purchasing a product.
          //when not null, it contains an array of virtual product identifiers, you can fetch those virtual products as usual, with store.get(id).
          pricingPhases, // Since v11, when a product is paid for in multiple phases (for example, trial followed by paid periods), this contains the list of phases.
            // Example: [{"price":"€1.19","priceMicros":1190000,"currency":"EUR","billingPeriod":"P1W","billingCycles":0,"recurrenceMode":"INFINITE_RECURRING","paymentMode":"PayAsYouGo"}]
        expiryDate, // Latest known expiry date for a subscription (a javascript Date)
        lastRenewalDate, // Latest date a subscription was renewed (a javascript Date)
        billingPeriod, // Duration of the billing period for a subscription, in the units specified by the billingPeriodUnit property. (not available on iOS < 11.2)
        billingPeriodUnit, // Units of the billing period for a subscription. Possible values: Minute, Hour, Day, Week, Month, Year. (not available on iOS < 11.2)
        trialPeriod, // Duration of the trial period for the subscription, in the units specified by the trialPeriodUnit property (windows only)
        trialPeriodUnit, // Units of the trial period for a subscription (windows only)
        */

        owned: false, // Product is owned
        canPurchase: true, // Product is in a state where it can be purchased
        valid: true, // Product has been loaded and is a valid product when product definitions can't be loaded from the store, you should display instead a warning like: "You cannot make purchases at this stage. Try again in a moment. Make sure you didn't enable In-App-Purchases restrictions on your phone."
        state: 'VALID', // Current state the product is in (see life-cycle below). Should be one of the defined product states
        ...remoteProducts[productId],
        id: productId, // Identifier of the product on the store
        loaded: true, // Product has been loaded from server, however it can still be either valid or not
        finish: () => {
          context.loadedProducts[productId].owned = true;
        }
      };

      log('refresh called');

      setTimeout(() => {
        context.handlers.ready?.map(handler => {
          log('ready emitted');
          handler();
        });
        Object.keys(context.loadedProducts).map(productId => {
          context.handlers.products?.[productId]?.loaded?.forEach(handler => {
            log(`${productId} loaded emitted`);
            handler(context.loadedProducts[productId])
          })
        });
      });

    }),
    ready: handler => {
      log(`ready handler added`);
      context.handlers.ready ??= [];
      context.handlers.ready.push(handler);
    }
  }
}

module.exports = createMockStore;