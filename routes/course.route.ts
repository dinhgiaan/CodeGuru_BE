import express from "express";
import { authenticateRole, isAuthenticated } from "../middleware/auth";
import { editCourse, generateVideoUrl, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controller/course.controller";
const courseRouter = express.Router();


courseRouter.post("/create-course", isAuthenticated, authenticateRole("admin"), uploadCourse);
courseRouter.put("/edit-course/:id", isAuthenticated, authenticateRole("admin"), editCourse);
courseRouter.post("/getVdoCipherOTP", generateVideoUrl);
courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);
courseRouter.get("/get-course-content/:id", isAuthenticated, getCourseByUser);

export default courseRouter;