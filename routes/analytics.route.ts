import  express  from "express";
import { authenticateRole, isAuthenticated } from "../middleware/auth";
import { getCoursesAnalytics, getOrdersAnalytics, getUsersAnalytics } from "../controller/analytics.controller";
const analyticsRouter = express.Router();

analyticsRouter.get("/get-users-analytics",isAuthenticated,authenticateRole("admin"),getUsersAnalytics);
analyticsRouter.get("/get-orders-analytics",isAuthenticated,authenticateRole("admin"),getOrdersAnalytics);
analyticsRouter.get("/get-courses-analytics",isAuthenticated,authenticateRole("admin"),getCoursesAnalytics);


export default analyticsRouter;