import { NextFunction, Request, Response } from "express";
import CatchAsyncError from '../middleware/catchAsycnError'
import ErrorHandler from "../utils/ErrorHandle";
import OrderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
import { newOrder } from "../services/order.service";

// create order
export const createOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, payment_info } = req.body as IOrder;
        const user = await userModel.findById(req.user?._id);
        const courseExistInUser = user?.courses.some((course: any) => course._id.toString() === courseId);
        if (courseExistInUser) {
            return next(new ErrorHandler("Bạn đã mua khóa học này trước đó!", 400));
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("Khóa học này không tồn tại!", 404));
        };

        const data: any = {
            courseId: course._id,
            userId: user?._id,
            payment_info
        };

        const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
            }
        }
        const html = await ejs.renderFile(path.join(__dirname, '../mails/order-confirm.ejs'), { order: mailData });

        try {
            if (user) {
                await sendMail({
                    email: user.email,
                    subject: "Xác nhận đơn hàng",
                    template: "order-confirm.ejs",
                    data: mailData
                });
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }

        if (user) {
            // Kiểm tra nếu user đã tồn tại
            user.courses.push(course?._id);  // Thêm _id của khóa học vào mảng courses của người dùng

            await user.save();  // Lưu lại các thay đổi cho user

            // Tạo thông báo cho người dùng
            await NotificationModel.create({
                user: user._id,
                title: "Đơn hàng mới",
                message: `Bạn có đơn đặt hàng mới từ ${user?.name}`
            });
        } else {
            return next(new ErrorHandler("Người dùng không tồn tại!", 400));  // Nếu không tìm thấy user
        }

        course.purchased = (course.purchased || 0) + 1;

        await course.save();

        newOrder(data, res, next);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})