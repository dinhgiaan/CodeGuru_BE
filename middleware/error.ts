import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandle";

const ErrorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (res.headersSent) {
        return next(err); // Đảm bảo rằng middleware không gửi thêm phản hồi nếu đã gửi trước đó
    }

    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal server error';

    if (err.name === 'CastError') {
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);
    }

    if (err.name === 'JsonWebTokenError') {
        const message = `Json web token không hợp lệ, vui lòng thử lại!`;
        err = new ErrorHandler(message, 400);
    }

    if (err.name === 'TokenExpiredError') {
        const message = `Json web token không hợp lệ, vui lòng thử lại!`;
        err = new ErrorHandler(message, 400);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
}
