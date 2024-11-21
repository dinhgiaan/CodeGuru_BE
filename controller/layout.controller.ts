import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandle";
import CatchAsyncError from "../middleware/catchAsycnError";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary";

export const createLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body;
    const isTypeExist = await LayoutModel.findOne({ type });

    // Kiểm tra xem loại layout đã tồn tại chưa
    if (isTypeExist) {
      return next(new ErrorHandler(`${type} already exists`, 400));
    }

    if (type === "Banner") {
      const { image, title, subTitle } = req.body;

      // Tải ảnh lên Cloudinary
      const myCloud = await cloudinary.v2.uploader.upload(image, {
        folder: "layout",
      });

      const banner = {
        type: "Banner",
        image: {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        },
        title,
        subTitle,
      };

      await LayoutModel.create(banner); // Tạo Banner mới
    }

    if (type === "FAQ") {
      const { faq } = req.body;

      // Kiểm tra dữ liệu FAQ
      const faqItem = await Promise.all(
        faq.map(async (item: any) => {
          return {
            question: item.question,
            answer: item.answer,
          };
        })
      );

      await LayoutModel.create({ type: "FAQ", faq: faqItem }); // Tạo FAQ mới
    }

    if (type === "Categories") {
      const { categories } = req.body;

      // Kiểm tra xem categories có phải là mảng hợp lệ không
      if (!Array.isArray(categories)) {
        return next(new ErrorHandler("Danh mục không hợp lệ", 400));
      }

      // Xử lý danh mục
      const categoriesItem = await Promise.all(
        categories.map(async (item: any) => {
          return {
            title: item.title.trim(), // Loại bỏ khoảng trắng thừa từ tên danh mục
          };
        })
      );

      // Tạo layout mới cho Categories
      await LayoutModel.create({ type: "Categories", categories: categoriesItem });

      res.status(200).json({
        success: true,
        message: "Tạo bố cục thành công",
      });
    }

  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Xử lý lỗi chung
  }
});

// Edit layout
export const editLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body;

    if (type === "Banner") {
      const { image, title, subTitle } = req.body;
      const bannerData: any = await LayoutModel.findOne({ type: "Banner" });

      if (bannerData) {
        // Xóa ảnh cũ nếu tồn tại
        await cloudinary.v2.uploader.destroy(bannerData.image.public_id);

        // Tải ảnh mới lên Cloudinary
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });

        const banner = {
          type: "Banner",
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          title,
          subTitle,
        };

        // Cập nhật Banner mới
        await LayoutModel.findByIdAndUpdate(bannerData._id, banner);
      }
    }

    if (type === "FAQ") {
      const { faq } = req.body;
      const faqItem = await LayoutModel.findOne({ type: "FAQ" });

      if (faqItem) {
        // Xóa các item FAQ cũ
        await LayoutModel.findByIdAndUpdate(faqItem.id, { faq: [] });

        const faqData = await Promise.all(
          faq.map(async (item: any) => {
            return {
              question: item.question,
              answer: item.answer,
            };
          })
        );

        // Cập nhật các FAQ mới
        await LayoutModel.findByIdAndUpdate(faqItem._id, { type: "FAQ", faq: faqData });
      }
    }

    if (type === "Categories") {
      const { categories } = req.body;
      const categoriesData = await LayoutModel.findOne({ type: "Categories" });

      const categoriesItem = await Promise.all(
        categories.map(async (item: any) => {
          return {
            title: item.title.trim(), // Loại bỏ khoảng trắng thừa
          };
        })
      );

      // Cập nhật danh mục mới
      await LayoutModel.findByIdAndUpdate(categoriesData?._id, {
        type: "Categories",
        categories: categoriesItem,
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật bố cục thành công",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Xử lý lỗi chung
  }
});

// Get layout by type
export const getLayoutByType = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params; // Lấy type từ URL
    const layout = await LayoutModel.findOne({ type });

    if (!layout) {
      return next(new ErrorHandler("Layout not found", 404)); // Nếu không tìm thấy layout
    }

    res.status(200).json({
      success: true,
      layout, // Trả về layout tìm được
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Xử lý lỗi chung
  }
});
