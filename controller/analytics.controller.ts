import { Request,Response,NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandle";
import CatchAsyncError from "../middleware/catchAsycnError"
import { generateLast12MonthsData } from "../utils/analytics.generator";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.model";

// get users analytics --- only for admin
export const getUsersAnalytics = CatchAsyncError(async(req:Request,res:Response,next:NextFunction) =>{
    try{
        const users = await generateLast12MonthsData(userModel);

        res.status(200).json({
            success:true,
            users,
        });
    }catch (error:any){
        return next(new ErrorHandler(error.message,500))
    }
    
})


// get courses analytics --- only for admin
export const getCoursesAnalytics = CatchAsyncError(async(req:Request,res:Response,next:NextFunction) =>{
    try{
        const course = await generateLast12MonthsData(CourseModel);

        res.status(200).json({
            success:true,
            course,
        });
    }catch (error:any){
        return next(new ErrorHandler(error.message,500))
    }
    
})
// get order analytics --- only for admin
export const getOrdersAnalytics = CatchAsyncError(async(req:Request,res:Response,next:NextFunction) =>{
    try{
        const order = await generateLast12MonthsData(OrderModel);

        res.status(200).json({
            success:true,
            order
        });
    }catch (error:any){
        return next(new ErrorHandler(error.message,500))
    }
    
})