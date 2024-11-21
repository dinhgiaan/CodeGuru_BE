import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './utils/db';
import connectRedis from './utils/redis';
import { v2 as cloudinary } from 'cloudinary';
import http from 'http';
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import layoutRouter from './routes/layout.route';
import analyticsRouter from './routes/analytics.route'; // Import analytics router
import { initSocketSever } from './socketSever';

const app = express();

dotenv.config({ path: path.resolve(__dirname, '.env.development') });

const server = http.createServer(app);
initSocketSever(server);

// Cấu hình CORS
app.use(
  cors({
    origin: process.env.ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Kết nối MongoDB
connectDB();

// Kết nối Redis
const redisClient = connectRedis();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

// Middleware xử lý body
app.use(express.json({ limit: '50mb' }));

// Middleware xử lý cookie
app.use(cookieParser());

// Đăng ký routes
app.use('/api/v1', userRouter, courseRouter, orderRouter, layoutRouter, analyticsRouter); // Thêm analyticsRouter

// Test API
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API đang hoạt động',
  });
});

// Xử lý đường dẫn không xác định
app.all('*', (req: Request, res: Response, next: NextFunction) => {
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
    error: err,
  });
});

// Khởi động server
server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

export default app;
