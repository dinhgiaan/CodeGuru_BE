import express from 'express';
import { authenticateRole, isAuthenticated } from '../middleware/auth';
import { createOrder, getAllOrder, newPayment, sendStripePublishableKey } from '../controller/order.controller';
const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenticated, createOrder);
orderRouter.get("/payment/stripepublishablekey", sendStripePublishableKey);
orderRouter.post("/payment", isAuthenticated, newPayment);
orderRouter.get("/get-orders", isAuthenticated, authenticateRole("admin"), getAllOrder)

export default orderRouter;