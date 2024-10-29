import express from 'express';
import {
    activationUser, deleteUser, getAllUsers, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateProfilePicture, updateUserInfo, updateUserPassword, updateUserRole, updateAccessToken
} from '../controller/user.controller';
import { authenticateRole, isAuthenticated } from '../middleware/auth';


const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/activation-user', activationUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', logoutUser);
userRouter.get('/me', isAuthenticated, getUserInfo);
// userRouter.get('/refresh', updateAccessToken);
userRouter.post('/social-auth', socialAuth);
userRouter.put('/update-user-info', isAuthenticated, updateUserInfo);
userRouter.put('/update-user-password', isAuthenticated, updateUserPassword);
userRouter.put('/update-user-avatar', isAuthenticated, updateProfilePicture);
userRouter.get("/get-users", isAuthenticated, authenticateRole("admin"), getAllUsers);
userRouter.get(
    "get-users",
    isAuthenticated,
    authenticateRole("admin"),
    getAllUsers
);

userRouter.put(
    "/update-user",
    isAuthenticated,
    authenticateRole("admin"),
    updateUserRole
);
userRouter.delete(
    "/delete-user/:id",
    isAuthenticated,
    authenticateRole("admin"),
    deleteUser
);

export default userRouter;
