import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createOrder, newPayment, sendStripePublishableKey } from '../controller/order.controller';
const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenticated, createOrder);
orderRouter.get("/payment/stripepublishablekey", sendStripePublishableKey);
orderRouter.post("/payment", isAuthenticated, newPayment);

export default orderRouter;