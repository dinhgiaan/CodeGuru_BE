import { Request, Response, NextFunction } from 'express'
import userModel, { IUser } from '../models/user.model'
import ErrorHandler from '../utils/ErrorHandle'
import CatchAsyncError from '../middleware/catchAsycnError'
import jwt, { JwtPayload, Secret } from 'jsonwebtoken'
import dotenv from 'dotenv';
import ejs from 'ejs'
import path from 'path'
import sendMail from '../utils/sendMail'
import { accessTokenOptions, refreshTokenOptions, sendToken } from '../utils/jwt'
import connectRedis from '../utils/redis'
import { getAllUsersService, getUserById, updateUserRoleService } from '../services/user.service'
import cloudinary from 'cloudinary';


dotenv.config({ path: path.resolve(__dirname, '.env.development') });

//register
interface IRegisterBody {
    name: string,
    email: string,
    password: string,
    avatar?: string
}

export const registerUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("Email này đã tồn tại, vui lòng sử dụng email khác!", 400))
        };

        const user: IRegisterBody = {
            name,
            email,
            password,
        };
        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.name }, activationCode };
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data);
        try {
            await sendMail({
                email: user.email,
                subject: "Kích hoạt tài khoản - CodeGuru",
                template: "activation-mail.ejs",
                data
            });
            res.status(201).json({
                success: true,
                message: `Hãy kiểm tra hộp thư của bạn: ${user.email} để kích hoạt tài khoản!`,
                activationToken: activationToken.token
            })
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
});

interface IActivationToken {
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jwt.sign({
        user, activationCode
    }, process.env.ACTIVATION_SECRET as Secret,
        {
            expiresIn: "20m",  //giới hạn expired token
        });
    return { token, activationCode };
}


//user activation
interface IActivationRequest {
    activation_token: string;
    activation_code: string
}

export const activationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;
        const newUser: { user: IUser; activationCode: string } = jwt.verify(
            activation_token, process.env.ACTIVATION_SECRET as string
        ) as { user: IUser; activationCode: string };

        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Mã kích hoạt không hợp lệ!", 400))
        }

        const { name, email, password } = newUser.user;
        const existUser = await userModel.findOne({ email });

        if (existUser) {
            return next(new ErrorHandler("Email này đã tồn tại, vui lòng sử dụng email khác!", 400));
        };

        const user = await userModel.create({
            name,
            email,
            password
        });

        res.status(201).json({
            success: true
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//login
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;

        if (!email || !password) {
            return next(new ErrorHandler("Vui lòng nhập tài khoản và mật khẩu!", 400));
        }

        const user = await userModel.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler("Tài khoản hoặc mật khẩu không đúng!", 400))
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Tài khoản hoặc mật khẩu không đúng!", 400))
        }

        sendToken(user, 200, res);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


//logout 
export const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });

        const userId = req.user?._id || "";

        connectRedis().del(userId);

        res.status(200).json({
            success: true,
            message: "Đăng xuất thành công",
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


//update access token
export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string;
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;
        const message = "Không thể làm mới token";
        if (!decoded) {
            return next(new ErrorHandler(message, 400));
        }

        const session = await connectRedis().get(decoded.id as string);
        if (!session) {
            return next(new ErrorHandler(message, 400));
        }

        const user = JSON.parse(session);

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, {
            expiresIn: "10m",
        });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {
            expiresIn: "7d",
        });

        req.user = user;

        res.cookie("access_token", accessToken, accessTokenOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenOptions);

        await connectRedis().set(user._id, JSON.stringify(user), "EX", 604800); // 7 ngày

        res.status(200).json({
            status: "success",
            accessToken,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})


//get user info
export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return next(new ErrorHandler("Thông tin người dùng không được tìm thấy!", 400));
        }
        getUserById(userId, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

interface ISocialAuthBody {
    email: string;
    name: string;
    avatar: string;
}

//social auth
export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar } = req.body as ISocialAuthBody;
        const user = await userModel.findOne({ email });
        if (!user) {
            const newUser = await userModel.create({ email, name, avatar });
            sendToken(newUser, 200, res);
        } else {
            sendToken(user, 200, res);
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


//update user info
interface IUpdateUserInfo {
    name?: string;
    email?: string;
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (name && user) {
            user.name = name;
        }

        await user?.save();

        if (userId) {
            await connectRedis().set(userId, JSON.stringify(user));
        } else {
            throw new Error('User ID không hợp lệ.');
        }

        res.status(201).json({
            success: true,
            user,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});



//update user password
interface IUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
}

export const updateUserPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdateUserPassword;
        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler("Vui lòng nhập mật khẩu cũ và mật khẩu mới!", 400));
        }

        const user = await userModel.findById(req.user?._id).select("+password");
        if (user?.password === undefined) {
            return next(new ErrorHandler("Người dùng không hợp lệ!", 400));
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Mật khẩu cũ không đúng!", 400));
        }

        user.password = newPassword;

        await user.save();

        await connectRedis().set(req.user?._id, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


//update profile picture
interface IUpdateProfilePicture {
    avatar: string,
}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body as IUpdateProfilePicture;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (!user) {
            return next(new ErrorHandler("Không tìm thấy người dùng", 404));
        }

        const cloudTasks: Promise<any>[] = [];

        // Check if the user has an existing avatar
        if (user.avatar && user.avatar.public_id) {
            cloudTasks.push(cloudinary.v2.uploader.destroy(user.avatar.public_id));
        }

        // Upload the new avatar if provided
        if (avatar) {
            cloudTasks.push(
                cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                })
            );
        }

        const results = await Promise.all(cloudTasks);

        // If the new avatar was uploaded, update the user's avatar
        if (results.length > 0 && results[results.length - 1]) {
            const myCloud = results[results.length - 1];
            user.avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }

        await user.save();
        await connectRedis().set(userId, JSON.stringify(user));

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});
// get all users --- chi cho admin
export const getAllUsers = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await getAllUsersService(res);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
)

// cập nhật vai trò --- cho admin

export const updateUserRole = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, role } = req.body;
        const isUserExist = await userModel.findOne({ email });
        if (isUserExist) {
            const id = isUserExist._id
            await updateUserRoleService(res, id, role);
        }
        else {
            res.status(400).json({
                success: false,
                message: "Không tìm thấy người dùng"
            })
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

// xóa người dùng --- cho admin
export const deleteUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const user = await userModel.findById(id);

            if (!user) {
                return next(new ErrorHandler("Không tìm thấy người dùng", 404));
            }

            await user.deleteOne({ id });

            await connectRedis().del(id);

            res.status(200).json({
                success: true,
                message: "Người dùng đã được xóa thành công",
            })
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
)
