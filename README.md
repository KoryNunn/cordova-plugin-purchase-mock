# cordova-plugin-purchase-mock

A mock implementation of the `store` object provided by [cordova-plugin-purchase](https://github.com/j3k0/cordova-plugin-purchase)

## Why

So you can write tests that use all the unmocked business logic in your code.

## Warning

I've only implemented the bare-minimum that I needed for my tests, you almost definitelly will hit limitations.
I encourage you to send PR's to flesh out this mock.

## Usage

```js
const createMockStore = require('cordova-plugin-purchase-mock');

test('Check that our integration with cordova-plugin-purchase works good', t => {
  const mockStore = createMockStore(

    // Parameter 1: Options
    {

      // Use this hook to tell the mock if the native purchase happend or not.
      // returning a transaction results in an "approved" event
      // returning null results in a "cancelled" event
      // The transaction will be set on product.transaction.
      onOrder: product => ({
        type: 'android-playstore',
        developerPayload: undefined,
        id: 'foo',
        purchaseToken: 'fakeToken',
        receipt: JSON.stringify({
            'orderId':'foo',
            'packageName':'app.gritlife.mobile',
            'purchaseTime': Date.now(),
            'purchaseState': 0,
            'purchaseToken':'fakeToken'
        }),
        signature: 'fakeSignature',
      })
    },

    // Parameter 1: "Remove" products
    // These are the products to be "loaded" from the payment provider when you call store.refresh()
    {
      'test_product_id': {
        id: 'test_product_id',
        price: '$0.99USD',
        title: 'Test',
        description: 'test product'
      }
    }
  );

  // Mock the inAppPurchase store
  app.window.store = mockStore;

  // Use the store..
});
```