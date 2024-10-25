import express from 'express';
import { activationUser, getAllUsers, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken, updateProfilePicture, updateUserInfo, updateUserPassword } from '../controller/user.controller';
import { authenticateRole, isAuthenticated } from '../middleware/auth';
const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/activation-user', activationUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', logoutUser);
userRouter.get('/refresh', isAuthenticated, updateAccessToken);
userRouter.get('/me', isAuthenticated, getUserInfo);
userRouter.post('/social-auth', socialAuth);
userRouter.put('/update-user-info', isAuthenticated, updateUserInfo);
userRouter.put('/update-user-password', isAuthenticated, updateUserPassword);
userRouter.put('/update-user-avatar', isAuthenticated, updateProfilePicture);
userRouter.get("/get-users", isAuthenticated, authenticateRole("admin"), getAllUsers);

export default userRouter

// , authenticateRole("admin"),