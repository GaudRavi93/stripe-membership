1. get all product api

- payload 

{
  "stripeAccountId": "acct_1QyT9cRfJLsnQGqx",
}


- response

{
  [
    {
      "accountId": "acct_1QyT9cRfJLsnQGqx",
      "name": "Ravi Test Plan Updated",
      "productId": "prod_RydgYs6eP7qrjc",
      "active": true,
      "createdAt": 1742466782,
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
      "prices": [
        {
          "active": true,
          "unit_amount": 1900,
          "interval": "month",
          "createdAt": 1742466783
          "id": "price_1R4gPLRfJLsnQGqxyIPRXOd9",
        },
        {
          "active": true,
          "unit_amount": 1000,
          "interval": "year",
          "createdAt": 1742466782
          "id": "price_1R4gPKRfJLsnQGqxooZo5UNg",
        }
      ],
      "events": [1, 2],
    },
    {
      "accountId": "acct_1QyT9cRfJLsnQGqx",
      "name": "Plan 2003",
      "productId": "prod_RydOc4iMy1LgFj",
      "active": true,
      "createdAt": 1742465695,
      "description": "description 2003",
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
          "id": "price_1R4g7oRfJLsnQGqx6wvorP6m",
          "active": true,
          "unit_amount": 1900,
          "interval": "month",
          "createdAt": 1742465696
        },
        {
          "id": "price_1R4g7nRfJLsnQGqxhMcdvIZX",
          "active": true,
          "unit_amount": 1000,
          "interval": "year",
          "createdAt": 1742465695
        }
      ],
      "events": [1, 2],
    },
    {
      "accountId": "acct_1QyT9cRfJLsnQGqx",
      "name": "Super Plan",
      "productId": "prod_Ryd9DcxAnz6Kfm",
      "active": true,
      "createdAt": 1742464814,
      "description": "description",
      "planBenefits": [],
      "sponsorBenefits": [],
      "prices": [
        {
          "active": true,
          "unit_amount": 1900,
          "interval": "month",
          "createdAt": 1742464814
          "id": "price_1R4ftaRfJLsnQGqxHc9mrQbA",
        },
        {
          "active": true,
          "unit_amount": 1000,
          "interval": "year",
          "createdAt": 1742464814
          "id": "price_1R4ftaRfJLsnQGqxcHaff97z",
        }
      ],
      "events": [],
    },
    {
      "productId": "prod_RsFIU37b2bqmdY",
      "accountId": "acct_1QyT9cRfJLsnQGqx",
      "active": true,
      "name": "Ravi Plan 2",
      "description": null,
      "planBenefits": [],
      "sponsorBenefits": [],
      "events": [],
      "prices": [
        {
          "active": true,
          "unit_amount": 1000,
          "interval": "year",
          "createdAt": 1742460752,
          "id": "price_1R4eq4RfJLsnQGqxQdfoLwh3",
        },
        {
          "active": true,
          "unit_amount": 1900,
          "interval": "month",
          "createdAt": 1740992183,
          "id": "price_1QyUnTRfJLsnQGqxx4ZJBVyx",
        }
      ],
      "createdAt": 1740992182
    }
  ]
}