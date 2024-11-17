import { Request,Response,NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandle";
import CatchAsyncError from "../middleware/catchAsycnError";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary"
import { title } from "process";

export const createLayout = CatchAsyncError(async (req:Request,res:Response,next:NextFunction)=>{
    try{
        const {type} = req.body;
        const isTypeExist = await LayoutModel.findOne({type});
        if(isTypeExist){
            return next (new ErrorHandler(`${type} already exist`, 400));
        }
        if(type === "Banner"){
            const {image,title,subTitle} = req.body
            const myCloud = await cloudinary.v2.uploader.upload(image,{
                folder:"layout",
            })
            const banner ={
                image:{
                    public_id:myCloud.public_id,
                    url: myCloud.secure_url,
                },
                title,
                subTitle
            }
            await LayoutModel.create(banner);
        }
        if(type ==="FAQ"){
            const {faq} = req.body;
            const faqItem = await Promise.all(
                faq.map(async(item:any)=>{
                    return{
                        question:item.question,
                        answer:item.answer
                    }
                })
            )
            await LayoutModel.create({type:"FAQ",faq: faqItem});
        }
        if(type ==="Categories"){
            const {categories} = req.body;
            const categoriesItem = await Promise.all(
                categories.map(async(item:any)=>{
                    return{
                        
                        title:item.title,
                    }
                })
            )
            await LayoutModel.create({type:"Categories", categories: categoriesItem});
        }
        res.status(200).json({
            success:true,
            message: "Tạo bố cục thành công",
        });

    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
});
// Edit layout
export const editLayout = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) =>{
    try{
        const {type} = req.body;
        if(type === "Banner"){
            const {image,title,subTitle} = req.body
            const bannerData:any = await LayoutModel.findOne({type:"Banner"});
            if(bannerData){
            await cloudinary.v2.uploader.destroy(bannerData.image.public_id);
            }
            const myCloud = await cloudinary.v2.uploader.upload(image,{
                folder: "layout",
            })
            const banner ={
                type:"Banner",
                image:{
                    public_id:myCloud.public_id,
                    url: myCloud.secure_url,
                },
                title,
                subTitle
            }
            await LayoutModel.findByIdAndUpdate(bannerData._id,{banner});
        }
        if(type ==="FAQ"){
            const {faq} = req.body;
            const FaqItem = await LayoutModel.findOne({ type:"FAQ"});
            if(FaqItem){
                await LayoutModel.findByIdAndUpdate(FaqItem.id,{faq:[]});
            }
            const faqItem = await Promise.all(
                faq.map(async(item:any)=>{
                    return{
                        question:item.question,
                        answer:item.answer
                    }
                })
            )
            await LayoutModel.findByIdAndUpdate(FaqItem?._id,{type:"FAQ",faq: faqItem});
        }
        if(type ==="Categories"){
            const {categories} = req.body;
            const categoriesData = await LayoutModel.findOne({ type:"Categories"});
            const categoriesItem = await Promise.all(
                categories.map(async(item:any)=>{
                    return{
                        
                        title:item.title,
                    }
                })
            )
            await LayoutModel.findByIdAndUpdate(categoriesData?._id,{type:"Categories", categories: categoriesItem});
        }
        res.status(200).json({
            success:true,
            message: "Cập bố cục thành công",
        });
    }catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
})
//get layout by type 
export const getLayoutByType = CatchAsyncError(async(req:Request,res:Response,next:NextFunction)=>{
    try{
        const layout = await LayoutModel.findOne(req.body.type);
        res.status(201).json({
            success:true,
            layout,
        })
    } catch (error:any){
        return next(new ErrorHandler(error.message,500));
    }
})