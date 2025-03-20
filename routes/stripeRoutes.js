const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const admin = require("firebase-admin");
const serviceAccount = require("../angular-stream-chat-by-ravi-firebase-adminsdk-nru5p-90010ff53a.json");

// initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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

    await db.collection("stripe_products").doc(product.id).set(productData);

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
    } = req.body;

    // Step 1: Check if the plan exists in Stripe
    try {
      const stripeProduct = await stripe.products.retrieve(productId, {
        stripeAccount: stripeAccountId,
      });

      console.log("Plan exists in Stripe:", stripeProduct.id);
    } catch (stripeError) {
      console.error("Error retrieving plan from Stripe:", stripeError);
      return res.status(404).json({
        success: false,
        message: "Plan not found in Stripe",
      });
    }

    // Step 2: Get the existing plan document from Firestore
    const planRef = db.collection("stripe_products").doc(productId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Plan not found in Firestore",
      });
    }

    if (planDoc.data().name !== name || planDoc.data().description !== description) {
      try {
        await stripe.products.update(
          productId,
          { name,  description},
          { stripeAccount: stripeAccountId }
        );
      } catch (error) {
        console.log("failed to update the name or description in stripe");
      }
    }

    // Step 3: Prepare the update data
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (planBenefits !== undefined) updateData.planBenefits = planBenefits;
    if (sponsorBenefits !== undefined)
      updateData.sponsorBenefits = sponsorBenefits;
    if (name !== undefined) updateData.name = name;
    if (events !== undefined) updateData.events = events;

    // Step 4: Update the plan document in Firestore
    await planRef.update(updateData);

    // Step 5: Fetch the updated plan document
    const updatedPlanDoc = await planRef.get();
    const updatedPlanData = updatedPlanDoc.data();

    // Return success response with updated plan data
    res.json({
      success: true,
      data: updatedPlanData,
    });
  } catch (error) {
    console.error("Error updating plan:", error);

    // Return error response
    res.status(500).json({
      success: false,
      message: "Failed to update plan",
      error: error.message,
    });
  }
});

router.get('/get-product/:stripeAccountId', async (req, res) => {
    try {
      const stripeAccountId = req.params.stripeAccountId; // Stripe Account ID from URL parameter
  
      // Step 1: Fetch all products from Stripe for the given stripeAccountId
      const stripeProducts = await stripe.products.list(
        {
          limit: 100, // Adjust the limit as needed
        },
        {
          stripeAccount: stripeAccountId, // Use the provided Stripe Account ID
        }
      );
  
      if (stripeProducts.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No products found for the given stripe account id.',
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
        const productRef = db.collection('stripe_products').doc(productId);
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
      console.error('Error fetching products:', error);
  
      // Return error response
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message,
      });
    }
});

module.exports = router;
