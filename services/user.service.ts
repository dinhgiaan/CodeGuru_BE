import { Response } from "express";
import connectRedis from "../utils/redis"
import userModel from "../models/user.model";

export const getUserById = async (id: string, res: Response) => {
    try {
        const redisClient = await connectRedis(); // Ensure you await the connection
        const userJson = await redisClient.get(id);

        if (userJson) {
            const user = JSON.parse(userJson);
            return res.status(200).json({
                success: true,
                user,
            });
        }

        return res.status(404).json({
            success: false,
            message: "Không tìm thấy người dùng",
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy người dùng",
        });
    }
};

export const getAllUsersService = async (res: Response) => {
    const users = await userModel.find().sort({ createdAt: -1 });
    return res.status(201).json({
        success: true,
        users
    });
}

export const updateUserRoleService = async (res: Response, id: string, role: string) => {
    const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });

    return res.status(201).json({
        success: true,
        user,
    });
}
