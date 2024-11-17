import express from "express"
import { authenticateRole, isAuthenticated } from "../middleware/auth";
import { createLayout, editLayout, getLayoutByType } from "../controller/layout.controller";
const layoutRouter = express.Router();

layoutRouter.post("/create-layout", isAuthenticated,authenticateRole("admin"), createLayout);
layoutRouter.put("/edit-layout", isAuthenticated,authenticateRole("admin"), editLayout);
layoutRouter.get("/get-layout/:type", getLayoutByType);

export default layoutRouter;