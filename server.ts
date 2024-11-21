import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './utils/db';
import connectRedis from './utils/redis';
import { v2 as cloudinary } from 'cloudinary';
import http from "http";
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import layoutRouter from './routes/layout.route';
import { initSocketSever } from './socketSever';

const app = express();

dotenv.config({ path: path.resolve(__dirname, '.env.development') });

const server = http.createServer(app); // Tạo HTTP server
initSocketSever(server); // Gọi hàm khởi tạo Socket.IO

// Cấu hình CORS để hỗ trợ WebSocket và cookie
app.use(cors({
    origin: process.env.ORIGIN || 'http://localhost:8888',
    credentials: true, // Cho phép gửi cookie qua WebSocket
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Kết nối với MongoDB
connectDB();

// Kết nối với Redis
const redisClient = connectRedis();

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});

// Tạo server và lắng nghe
server.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

// Middleware xử lý body
app.use(express.json({ limit: "50mb" }));

// Middleware xử lý cookie
app.use(cookieParser());

//routes
app.use("/api/v1/", userRouter, courseRouter, orderRouter, layoutRouter);

// Test API
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: "API đang hoạt động"
    });
});

// Xử lý đường dẫn không xác định
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Đường dẫn ${req.originalUrl} không được tìm thấy`);
    (err as any).statusCode = 404;
    next(err);
});

// Middleware xử lý lỗi
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi server',
        error: err
    });
});

export default app;
