1. update product api

- payload 

{
  "productId": "prod_RydgYs6eP7qrjc",
  "stripeAccountId": "acct_1QyT9cRfJLsnQGqx",
  "description": "Description Updated",
  "planBenefits": [
    "planBenefits 1",
    "planBenefits 2",
    "planBenefits 3",
    "planBenefits 4"
  ],
  "sponsorBenefits": [
    "sponsorBenefits 1",
    "sponsorBenefits 2",
    "sponsorBenefits 3",
    "sponsorBenefits 4"
  ],
  "name": "Ravi Test Plan Updated",
  "events": [1, 2]
}

- response

{
  "accountId": "acct_1QyT9cRfJLsnQGqx",
  "name": "Ravi Test Plan Updated",
  "productId": "prod_RydgYs6eP7qrjc",
  "active": true,
  "createdAt": 1742466782,
  "description": "Description Updated"
  "planBenefits": [
    "planBenefits 1",
    "planBenefits 2",
    "planBenefits 3",
    "planBenefits 4"
  ],
  "sponsorBenefits": [
    "sponsorBenefits 1",
    "sponsorBenefits 2",
    "sponsorBenefits 3",
    "sponsorBenefits 4"
  ],
  "prices": [
    {
      "active": true,
      "interval": "year",
      "unit_amount": 1000,
      "createdAt": 1742466782,
      "id": "price_1R4gPKRfJLsnQGqxooZo5UNg",
    },
    {
      "active": true,
      "interval": "month",
      "unit_amount": 1900,
      "createdAt": 1742466783,
      "id": "price_1R4gPLRfJLsnQGqxyIPRXOd9",
    }
  ],
  "events": [1, 2],
}
