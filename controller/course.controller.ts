import { Request, Response, NextFunction } from "express";
import CatchAsyncError from "../middleware/catchAsycnError"
import ErrorHandler from "../utils/ErrorHandle";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import axios from "axios";
import connectRedis from "../utils/redis";
import mongoose from "mongoose";
import ejs from 'ejs';
import path from "path";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";


//upload course
export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;

        // Kiểm tra nếu thumbnail là một chuỗi
        if (typeof thumbnail === 'string') {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            };
        } else {
            return next(new ErrorHandler("Thumbnail must be a string URL", 400));
        }

        createCourse(data, res, next);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


//edit course
export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = await CourseModel.findById(courseId) as any;

        if (thumbnail && !thumbnail.startsWith("https")) {
            await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            };
        }

        // Ensure thumbnail is defined before checking startsWith
        if (thumbnail && thumbnail.startsWith("https")) {
            data.thumbnail = {
                public_id: courseData?.thumbnail.public_id,
                url: courseData?.thumbnail.url
            }
        }

        const course = await CourseModel.findByIdAndUpdate(
            courseId,
            {
                $set: data,
            },
            { new: true }
        );

        res.status(201).json({
            success: true,
            course,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//tạo url cho video
export const generateVideoUrl = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { videoId } = req.body;
        const response = await axios.post(
            `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
            { ttl: 300 },
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
                },
            }
        );
        res.json(response.data);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})


// get single course --- with no pay
export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;
        const isCacheExist = await connectRedis().get(courseId);

        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            });
        }
        else {
            const course = await CourseModel.findById(req.params.id).select(
                "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            res.status(200).json({
                success: true,
                course,
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// get all course -- with no pay
export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const course = await CourseModel.find().select(
            "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

        res.status(200).json({
            success: true,
            course,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// get course content -- for valid user
export const getCourseByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses
        const courseId = req.params.id;

        const courseExist = userCourseList?.find((courses: any) => courses.courseId === courses.courseId);

        if (!courseExist) {
            return next(new ErrorHandler("Bạn không được phép xem khóa học này", 404));
        }

        const course = await CourseModel.findById(courseId);

        const content = course?.courseData;

        res.status(200).json({
            success: true,
            content
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// get all courses --- admin
export const getAdminAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllCoursesService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

// delete course --- admin
export const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const course = await CourseModel.findById(id);

        if (!course) {
            return next(new ErrorHandler("Không tìm thấy khóa học", 404));
        }

        await course.deleteOne({ id });

        await connectRedis().del(id);

        res.status(200).json({
            success: true,
            message: "Xóa khóa học thành công"
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

//add question in course
interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}
export const addQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, courseId, contentId }: IAddQuestionData = req.body;
        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("ID nội dung không hợp lệ", 400))
        }

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));

        if (!courseContent) {
            return next(new ErrorHandler("ID nội dung không hợp lệ", 400))

        }
        // create a new question object
        const newQuestion: any = {
            user: req.user,
            question,
            questionReplies: [],
        }
        // add this question to our course content
        courseContent.questions.push(newQuestion);
        // save the updated course
        await course?.save();

        res.status(200).json({
            success: true,
            course,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})
// adđ answer in course question
interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}
export const addAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body;
        const course = await CourseModel.findById(courseId);
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("ID nội dung không hợp lệ", 400))
        }

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));

        if (!courseContent) {
            return next(new ErrorHandler("ID nội dung không hợp lệ", 400))

        }
        const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId));

        if (!question) {
            return next(new ErrorHandler("ID câu hỏi không hợp lệ ", 400))
        }
        //create a new answer object
        const newAnswer: any = {
            user: req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),

        }
        //add this answer to our course content
        question.questionReplies.push(newAnswer);

        await course?.save();

        if (req.user?._id === question.user._id) {
            //create a notification
        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title,
            }
            const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);
            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Trả lời câu hỏi",
                    template: "question-reply.ejs",
                    data,
                })
            } catch (error: any) {
                return next(new ErrorHandler(error.message, 500))

            }
        }
        res.status(200).json({
            success: true,
            course,
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})
// add review in course
interface IAddReviewData {
    review: string;
    rating: number;
    userId: string;
}

export const addReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses;

        const courseId = req.params.id;
        //check if courseID already exists in userCourseList based on _id
        const courseExists = userCourseList?.some((course: any) => course.courseId === courseId.toString())

        if (!courseExists) {
            return next(new ErrorHandler("Bạn không đủ điều kiện để truy cập khóa học này", 404))
        }
        const course = await CourseModel.findById(courseId);

        const { review, rating } = req.body as IAddReviewData;

        const reviewData: any = {
            user: req.user,
            rating,
            comment: review,
        }
        course?.reviews.push(reviewData)

        let avg = 0;

        course?.reviews.forEach((rev: any) => {
            avg += rev.rating;
        })

        if (course) {
            course.rating = avg / course.reviews.length;
        }
        await course?.save();


        // create nottification
        await NotificationModel.create({
            user: req.user?._id,
            title: "Đã nhận được đánh giá mới",
            message: `${req.user?.name} đã đánh giá khoá học ${course?.name}`,
        })




        res.status(200).json({
            success: true,
            course,
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})
// add reply in review
interface IAddReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
}
export const addReplyToReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { comment, courseId, reviewId } = req.body as IAddReviewData;

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return next(new ErrorHandler("Không tìm thấy khóa học", 404))
        }

        const review = course?.reviews?.find((rev: any) => rev._id.toString() === reviewId);

        if (!review) {
            return next(new ErrorHandler("Không tìm thấy đánh giá", 404))
        }

        const replyData: any = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),

        }
        if (!review.commentReplies) {
            review.commentReplies = []
        }
        review.commentReplies?.push(replyData);

        await course?.save();

        res.status(200).json({
            success: true,
            course,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }

})