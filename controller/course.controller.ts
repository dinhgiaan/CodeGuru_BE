import { Request, Response, NextFunction } from "express";
import CatchAsyncError from "../middleware/catchAsycnError"
import ErrorHandler from "../utils/ErrorHandle";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import axios from "axios";
//import axios from "";


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
        const courseId = req.params.id;

        //kiểm tra xem thumbnail có public_id không
        if (data.thumbnail && data.thumbnail.public_id) {
            await cloudinary.v2.uploader.destroy(data.thumbnail.public_id);
        }

        if (typeof data.thumbnail === 'string') {
            const myCloud = await cloudinary.v2.uploader.upload(data.thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
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
