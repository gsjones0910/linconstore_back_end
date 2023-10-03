import express, { Express, Request, response, Response } from "express";
import userRouter from "./routers/user";
import { dbconnect } from "./db/connect";
import sellerRouter from "./routers/Seller";
import categoryRouter from "./routers/Category";
import productRouter from "./routers/product";
import notificationRouter from "./routers/notification.routes";
import adminRouter from "./routers/admin";
import chatRoomRouter from "./routers/chatRoom.routes";
import reportRouter from "./routers/report.routes";
import { ExchangeRateService } from "./components/currency/services";
import routes from "./routers";
import * as http from "http";
import cors from "cors";
import cron from "node-cron";
import {
  deleteInvalidProductActivity,
  deleteInvalidProductOrders,
  deleteInvalidProductRefund,
  deleteInvalidProductsRating,
  deleteInvalidProductsReviews,
  deleteInvalidStores,
  handleSetSellerRep,
  updateActivity,
  updateCart,
  updateHotdeals,
  updateOrders,
  updateProductStatus,
  updateShipping,
  updateStoreActivity,
} from "./Helpers/helpers";
import Stripe from "stripe";
import { initializeSocket } from "./socket";
const app: Express = express();
export const stripe: Stripe = new Stripe(process.env.SECRETKEY as string, {
  apiVersion: "2022-08-01",
});

import * as treblle from "treblle";

import { PostHog } from "posthog-node";
const client = new PostHog("phc_g0aaulGWsWuWDEYoUJbrtP2zOPs6GYYwQRblImjrQja", {
  host: "https://eu.posthog.com",
});

client.capture({
  distinctId: "test-id",
  event: "test-event",
});
// Send queued events immediately. Use for example in a serverless environment
// where the program may terminate before everything is sent
client.flush();

app.use(cors({ origin: true }));
// app.use(cors({ origin: 'https://linconstore.com' }));
const server = http.createServer(app);
dbconnect;

initializeSocket(server);

// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });
// app.all('*', (req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "*");
//     res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Content-Type');
//     next();
// });
cron.schedule("*/1 * * * *", () => {
  //this will run every 1 minute
  updateShipping();
  updateProductStatus();
  updateOrders(); //------added cache----------//
  deleteInvalidStores();
  // deleteInvalidProductsRating()
  // deleteInvalidProductActivity()
  // deleteInvalidProductRefund()
  // deleteInvalidProductOrders()
});
cron.schedule("*/10 * * * *", () => {
  //this will run every 10 minutes
  updateHotdeals(); //------added cache----------//
});

cron.schedule("*/5 * * * *", () => {
  // this will run every 5 minutes
  updateStoreActivity(); //------added cache----------//
});

cron.schedule("0 */5 * * *", () => {
  // this will run every 5 hours
  ExchangeRateService.generateExchangeRate(); //generate exchange rate
});
cron.schedule("*/10 * * * *", async () => {
  //this will run every 10 minutes
  await updateCart();
});
cron.schedule("0 0 0 * * *", () => {
  //this will run every day at 12 am
  updateShipping();
  updateActivity();
  handleSetSellerRep();
});
const port = process.env.PORT;

//webhooks event for receiving stripe subscription

app.post(
  "/webhooks",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response) => {
    // @ts-ignore
    const sig: string | string[] | Buffer = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.endpointSecret as string
      );
    } catch (err: any) {
      response.status(400).send(`webhook error : ${err.message}`);
      return;
    }
    //handling the event
    switch (event.type) {
      case "customer.subscription.created":
        const subscription = event.data.object;
        break;
      case "customer.subscription.deleted":
        const subscription1 = event.data.object;
        break;
      case "customer.subscription.updated":
        const subscription2 = event.data.object;
        break;
      default:
        console.log(`unhandled event type ${event.type}`);
    }
    response.status(200).send();
  }
);

app.use(express.json()); //allows us to parse incoming request to json

app.use(routes);
app.use(userRouter);
app.use(adminRouter);
app.use(categoryRouter);
app.use(sellerRouter);
app.use(productRouter);
app.use(notificationRouter);
app.use(chatRoomRouter);
app.use(reportRouter);

treblle.useTreblle(app, {
  apiKey: process.env.TREBLLE_APIKEY,
  projectId: process.env.TREBLLE_PROJECTID,
});

server.listen(port, () => {
  console.log("running on port " + " " + port);
});
