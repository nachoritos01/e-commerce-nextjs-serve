/**
 * order controller
 */

import { factories } from "@strapi/strapi";

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async paymentOrder(ctx) {
      const calcDiscount = (price, discount) => {
        if (!discount) return price;

        const discountValue = (price * discount) / 100;
        const finalPrice = price - discountValue;

        return finalPrice.toFixed(2);
      };
      try {
        const { token, products, idUser, addressShipping } = ctx.request.body;

        let totalPayment = 0;

        products.forEach((product) => {
          const priceTemp = calcDiscount(
            product.attributes.price,
            product.attributes.discount
          );

          totalPayment += Number(priceTemp) * product.quantity;
        });

        const charge = await stripe.charges.create({
          amount: Math.round(totalPayment * 100),
          currency: "usd",
          source: token,
          description: `id user Payment ${idUser}`,
        });

        const data: any = {
          products,
          user: idUser,
          totalPayment,
          idPayment: charge.id,
          addressShipping,
        };

        const model = strapi.contentType["api::order.order"];

        /* const validData = await strapi.entityValidator.validateEntityCreation(
          model,
          data
        ); */

        const entry = await strapi.db
          .query("api::order.order")
          .create({ data });

        return entry;
      } catch (err) {
        ctx.body = err;
      }
    },
  })
);
