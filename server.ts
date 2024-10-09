import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './utils/db'; // Import kết nối MongoDB
import connectRedis from './utils/redis'; // Import kết nối Redis
import ErrorMiddleware from './middleware/error';
const app = express();
import userRouter from './routes/user.route'
import { v2 as cloudinary } from 'cloudinary';


dotenv.config({ path: path.resolve(__dirname, '.env.development') });

// Kết nối tới database MongoDB
connectDB();

//kết nối tới Redis
const redisClient = connectRedis();

//cloudinary config
cloudinary.config({
     cloud_name: process.env.CLOUD_NAME,
     api_key: process.env.CLOUD_API_KEY,
     api_secret: process.env.CLOUD_SECRET_KEY,
});

// Tạo server
app.listen(process.env.PORT, () => {
     console.log(`Server is running on port ${process.env.PORT}`);
});

//body parser
app.use(express.json({ limit: "50mb" }));

//cookie parser
app.use(cookieParser());

//routes
app.use("/api/v1/", userRouter);

// CORS - cho phép chia sẻ tài nguyên giữa các domain khác nhau
app.use(cors({
     origin: process.env.ORIGIN
}));

//test API
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
     res.status(200).json({
          success: true,
          message: "API đang hoạt động"
     });
});

//xử lý đường dẫn không xác định
app.all("*", (req: Request, res: Response, next: NextFunction) => {
     const err = new Error(`Đường dẫn ${req.originalUrl} không được tìm thấy`);
     (err as any).statusCode = 404;
     next(err);
});

//middleware xử lý lỗi
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
     const statusCode = err.statusCode || 500;
     res.status(statusCode).json({
          success: false,
          message: err.message || 'Lỗi server'
     });
});

app.use(ErrorMiddleware);

export default app;
