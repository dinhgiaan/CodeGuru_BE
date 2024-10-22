import { Response } from "express";
import connectRedis from "../utils/redis"
import userModel from "../models/user.model";



//get user by id
export const getUserById = async (id: string, res: Response) => {
    const userJson = await connectRedis().get(id);

    if (userJson) {
        const user = JSON.parse(userJson)
        res.status(201).json({
            success: true,
            user,
        })
    }
};
// get All users
export const getAllUsersService = async (res:Response) =>{
    const users = await userModel.find().sort({crearedAt: -1});
    res.status(201).json({
        success:true,
        users
    })
}