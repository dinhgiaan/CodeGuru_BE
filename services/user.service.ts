import { Response } from "express";
import connectRedis from "../utils/redis"
import userModel from "../models/user.model";

export const getUserById = async (id: string, res: Response) => {
    const userJson = await connectRedis().get(id);

    if (userJson) {
        const user = JSON.parse(userJson);
        return res.status(201).json({  // Thêm return ở đây
            success: true,
            user,
        });
    }

    // Thêm một phản hồi khác nếu userJson không tồn tại để tránh trường hợp không gửi được phản hồi
    return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
    });
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
