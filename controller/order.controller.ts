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
import connectRedis from "../utils/redis";
require('dotenv').config({ path: '.env.development' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// Hàm chuyển đổi VND sang smallest currency unit (1 VND)
const convertVNDToStripeAmount = (amount: number) => {
    // Stripe requires amount in smallest currency unit
    // For VND, the smallest unit is 1 VND
    return Math.round(amount);
};

// Hàm kiểm tra số tiền tối thiểu (khoảng 12,000 VND ~ $0.50)
const isValidAmount = (amount: number) => {
    const minAmount = 12000; // Tương đương với ~$0.50
    return amount >= minAmount;
};

// create order
export const createOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, payment_info } = req.body as IOrder;

        if (payment_info) {
            if ("id" in payment_info) {
                const paymentIntentId = payment_info.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

                if (paymentIntent.status !== "succeeded") {
                    return next(new ErrorHandler("Thanh toán này chưa được xác thực", 400));
                };

                // Kiểm tra tiền tệ
                if (paymentIntent.currency !== 'vnd') {
                    return next(new ErrorHandler("Đơn vị tiền tệ không hợp lệ", 400));
                }
            };
        };

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
            user.courses.push(course?._id);
            await connectRedis().set(req.user?._id, JSON.stringify(user));
            await user.save();

            // Tạo thông báo cho người dùng
            await NotificationModel.create({
                user: user._id,
                title: "Đơn hàng mới",
                message: `Bạn có đơn hàng mới từ ${user?.name}`
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

// gửi key thanh toán
export const sendStripePublishableKey = CatchAsyncError(async (req: Request, res: Response) => {
    res.status(200).json({
        publishablekey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// thanh toán mới
export const newPayment = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { amount } = req.body;
        // Kiểm tra số tiền tối thiểu
        if (!isValidAmount(amount)) {
            return next(new ErrorHandler("Số tiền thanh toán phải từ 12,000₫ trở lên", 400));
        }
        // Chuyển đổi sang đơn vị tiền nhỏ nhất của VND
        const stripeAmount = convertVNDToStripeAmount(amount);
        const myPayment = await stripe.paymentIntents.create({
            amount: stripeAmount,
            currency: "vnd",
            metadata: {
                company: "CodeGuru"
            },
            automatic_payment_methods: {
                enabled: true
            },
        });

        res.status(201).json({
            success: true,
            client_secret: myPayment.client_secret
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})