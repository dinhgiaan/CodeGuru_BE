import express from "express";
import { authenticateRole, isAuthenticated } from "../middleware/auth";
import { addAnswer, addQuestion, addReplyToReview, addReview, deleteCourse, editCourse, generateVideoUrl, getAdminAllCourses, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controller/course.controller";
const courseRouter = express.Router();


courseRouter.post("/create-course", isAuthenticated, authenticateRole("admin"), uploadCourse);
courseRouter.put("/edit-course/:id", isAuthenticated, authenticateRole("admin"), editCourse);
courseRouter.post("/getVdoCipherOTP", generateVideoUrl);
courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);
courseRouter.get("/get-admin-courses", isAuthenticated, authenticateRole("admin"), getAdminAllCourses);
courseRouter.get("/get-course-content/:id", isAuthenticated, getCourseByUser);
courseRouter.delete("/delete-course/:id", isAuthenticated, authenticateRole("admin"), deleteCourse);
courseRouter.put("/add-question", isAuthenticated, addQuestion);
courseRouter.put("/add-answer", isAuthenticated, addAnswer);
courseRouter.put("/add-review/:id", isAuthenticated, addReview);
courseRouter.put("/add-reply", isAuthenticated, authenticateRole("admin"), addReplyToReview);

export default courseRouter;