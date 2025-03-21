const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const admin = require("firebase-admin");
const serviceAccount = require("../angular-stream-chat-by-ravi-firebase-adminsdk-nru5p-90010ff53a.json");

// initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://angular-stream-chat-by-ravi-default-rtdb.firebaseio.com"
});

router.post("/create-product", async (req, res) => {
  try {
    const {
      description,
      planBenefits,
      sponsorBenefits,
      name,
      prices,
      events,
      stripeAccountId,
    } = req.body;

    if (
      !stripeAccountId ||
      !name ||
      !prices ||
      !Array.isArray(prices) ||
      prices.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Verify connected account exists and has completed onboarding
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.details_submitted) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Connected account not fully onboarded. Please complete setup.",
        });
    }

    // step 1: create a product in Stripe
    const product = await stripe.products.create(
      {
        name: name,
        description: description,
      },
      { stripeAccount: stripeAccountId }
    );

    // step 2: create prices in Stripe
    const createdPrices = [];
    for (const price of prices) {
      if (!price.unit_amount || !price.interval) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Price must contain unit_amount in cent and interval",
          });
      }

      const stripePrice = await stripe.prices.create(
        {
          unit_amount: price.unit_amount,
          currency: "usd",
          recurring: {
            interval: price.interval, // (month/year)
          },
          product: product.id, // associate with the product
        },
        { stripeAccount: stripeAccountId }
      );

      createdPrices.push({
        id: stripePrice.id,
        active: stripePrice.active,
        interval: price.interval,
        unit_amount: price.unit_amount,
        createdAt: stripePrice.created,
      });
    }

    // step 3: store data in Firestore
    const productData = {
      accountId: stripeAccountId,
      name: name,
      productId: product.id,
      active: product.active,
      createdAt: product.created,
      description: description,
      planBenefits: planBenefits,
      sponsorBenefits: sponsorBenefits,
      prices: createdPrices,
      events: events || [],
    };

    await admin.firestore().collection("stripe_products").doc(product.id).set(productData);

    // Step 4: Update events with planId in Realtime Database
    if (Array.isArray(events) && events.length > 0) {
      const dbRef = admin.database().ref();

      const eventPromises = events.map((eventId) => {
        return dbRef.child(`/events/${eventId}/subscriptionId`).set(product.id);
      });

      await Promise.all(eventPromises);
    }

    // return success response
    res.json({ success: true, data: productData });
  } catch (error) {
    console.error("Error creating plan:", error);

    // return error response
    res.status(500).json({
      success: false,
      message: "Failed to create plan",
      error: error.message,
    });
  }
});

router.post("/update-product", async (req, res) => {
  try {
    const {
      productId,
      stripeAccountId,
      description,
      planBenefits,
      sponsorBenefits,
      name,
      events,
      prices,
    } = req.body;

    // step 1: check if the product exists in stripe
    try {
      if (!productId || !stripeAccountId) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Missing productId or stripeAccountId",
          });
      }

      const stripeProduct = await stripe.products.retrieve(productId, {
        stripeAccount: stripeAccountId,
      });

      console.log("Plan exists in Stripe:", stripeProduct.id);
    } catch (stripeError) {
      console.error("Error retrieving product from stripe:", stripeError);
      return res.status(404).json({
        success: false,
        message: "Product not found in stripe",
      });
    }

    // step 2: get the existing product document from Firestore
    const productRef = admin.firestore().collection("stripe_products").doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Product not found in Firestore",
      });
    }

    // step 3: update product name/description in stripe if changed
    const firestoreProduct = productDoc.data();
    if (
      firestoreProduct.name !== name ||
      firestoreProduct.description !== description
    ) {
      try {
        await stripe.products.update(
          productId,
          { name, description },
          { stripeAccount: stripeAccountId }
        );
      } catch (error) {
        console.error("Failed to update stripe product:", error);
      }
    }

    // step 4: fetch all the prices event disabled
    const existingPrices = await stripe.prices.list(
      { product: productId },
      { stripeAccount: stripeAccountId }
    );

    const newPrices = [];
    const pricesToKeep = [];

    // process requested prices
    for (const reqPrice of prices) {
      // check if price already exists with the same amount and interval
      const existingPrice = existingPrices.data.find(
        (p) =>
          p.unit_amount === reqPrice.unit_amount &&
          p.recurring?.interval === reqPrice.interval
      );

      if (existingPrice) {
        // keep existing price
        const updatedPrice = await stripe.prices.update(
          existingPrice.id,
          { active: true },
          { stripeAccount: stripeAccountId }
        );

        pricesToKeep.push({
          id: existingPrice.id,
          active: updatedPrice.active,
          createdAt: updatedPrice.created,
          interval: reqPrice.interval,
          unit_amount: reqPrice.unit_amount,
        });
      } else {
        // create new price
        const newPrice = await stripe.prices.create(
          {
            currency: "usd",
            unit_amount: reqPrice.unit_amount,
            recurring: { interval: reqPrice.interval },
            product: productId,
          },
          { stripeAccount: stripeAccountId }
        );

        newPrices.push({
          id: newPrice.id,
          active: newPrice.active,
          interval: reqPrice.interval,
          createdAt: newPrice.created,
          unit_amount: reqPrice.unit_amount,
        });
      }
    }

    // disable prices not included in the request
    for (const price of existingPrices.data) {
      if (!pricesToKeep.some((p) => p.id === price.id)) {
        await stripe.prices.update(
          price.id,
          { active: false },
          { stripeAccount: stripeAccountId }
        );
      }
    }

    // Update events with planId in Realtime Database
    if (Array.isArray(events) && events.length > 0) {
      const dbRef = admin.database().ref();

      const eventPromises = events.map((eventId) => {
        return dbRef.child(`/events/${eventId}/subscriptionId`).set(productId);
      });

      await Promise.all(eventPromises);
    }

    // prepare Firestore update data
    const updateData = {
      name,
      events,
      description,
      planBenefits,
      sponsorBenefits,
      prices: [...pricesToKeep, ...newPrices],
    };

    await productRef.update(updateData);

    // return updated product data
    res.json({
      success: true,
      data: updateData,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
});

router.get("/get-product/:stripeAccountId", async (req, res) => {
  try {
    const stripeAccountId = req.params.stripeAccountId; // Stripe Account ID from URL parameter

    if (!stripeAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing stripeAccountId" });
    }

    // Step 1: Fetch all products from Stripe for the given stripeAccountId
    const stripeProducts = await stripe.products.list(
      {
        active: true,
        limit: 100, // Adjust the limit as needed
      },
      {
        stripeAccount: stripeAccountId, // Use the provided Stripe Account ID
      }
    );

    if (stripeProducts.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for the given stripe account id.",
      });
    }

    // Step 2: Fetch details for each product
    const products = [];
    for (const stripeProduct of stripeProducts.data) {
      const productId = stripeProduct.id;

      // Step 3: Fetch active prices for the product from Stripe
      const stripePrices = await stripe.prices.list(
        {
          product: productId,
          active: true, // Fetch only active prices
        },
        {
          stripeAccount: stripeAccountId, // Use the provided Stripe Account ID
        }
      );

      // Step 4: Fetch additional metadata from Firestore
      const productRef = admin.firestore().collection("stripe_products").doc(productId);
      const productDoc = await productRef.get();

      let productData = {};
      if (productDoc.exists) {
        productData = productDoc.data();
      }

      // Step 5: Combine Stripe and Firestore data
      const productDetails = {
        productId: productId,
        accountId: stripeAccountId,
        active: stripeProduct.active,
        name: stripeProduct.name,
        description: productData.description || stripeProduct.description,
        planBenefits: productData.planBenefits || [],
        sponsorBenefits: productData.sponsorBenefits || [],
        events: productData.events || [],
        prices: stripePrices.data.map((price) => ({
          id: price.id,
          active: price.active,
          unit_amount: price.unit_amount,
          interval: price.recurring?.interval,
          createdAt: price.created,
        })),
        createdAt: productData.createdAt || stripeProduct.created,
      };

      products.push(productDetails);
    }

    // Return success response with the list of products
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);

    // Return error response
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

router.delete("/delete-product", async (req, res) => {
  try {
    const { productId, stripeAccountId } = req.body;
    if (!productId || !stripeAccountId) {
      return res.status(400).json({ success: false, message: "Product ID and Stripe Account ID are required." });
    }

    // Step 1: Fetch all active prices under the product
    const activePrices = await stripe.prices.list(
      { product: productId, active: true },
      { stripeAccount: stripeAccountId }
    );

    // Step 2: Deactivate all active prices in Stripe and update Firestore
    const productRef = admin.firestore().collection("stripe_products").doc(productId);

    const priceUpdatePromises = activePrices.data.map(async (price) => {
      const archivedPrice = await stripe.prices.update(price.id, { active: false }, { stripeAccount: stripeAccountId });
      return {
        id: archivedPrice.id,
        active: archivedPrice.active,
        unit_amount: archivedPrice.unit_amount,
        interval: archivedPrice.recurring?.interval,
        createdAt: archivedPrice.created,
      };
    });
  
    // Wait for all the price updates to complete and store the results
    const updatePrices = await Promise.all(priceUpdatePromises);
    console.log('updatePrices: ', updatePrices);
  
    // Update Firestore with the new price data
    await productRef.update({
      active: false,
      prices: updatePrices,
      archivedAt: Date.now(),
    });

    // Deactivate the Stripe product
    await stripe.products.update(productId, { active: false }, { stripeAccount: stripeAccountId });

    // Return success response
    res.json({ success: true, message: "Product and all associated prices archived successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
  }
});

module.exports = router;
