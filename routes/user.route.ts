import express from 'express';
import { activationUser, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken, updateUserInfo } from '../controller/user.controller';
import { authenticateRole, isAuthenticated } from '../middleware/auth';
const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/activation-user', activationUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', isAuthenticated, authenticateRole("admin"), logoutUser);
userRouter.get('/refresh', updateAccessToken);
userRouter.get('/me', isAuthenticated, getUserInfo);
userRouter.post('/social-auth', socialAuth);
userRouter.put('/update-user-info', isAuthenticated, updateUserInfo);

export default userRouter