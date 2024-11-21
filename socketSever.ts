import { Server as SocketIOServer } from "socket.io";
import http from "http";

// Khởi tạo một instance Socket.IO chỉ một lần
let io: SocketIOServer | null = null;

export const initSocketSever = (server: http.Server) => {
    if (!io) { // Kiểm tra nếu chưa khởi tạo
        io = new SocketIOServer(server, {
            transports: ['websocket'], // Đảm bảo chỉ sử dụng WebSocket
            cors: {
                origin: process.env.ORIGIN || 'http://localhost:8888', // CORS cấu hình theo đúng origin
                credentials: true, // Cho phép gửi cookie
            }
        });

        io.on("connection", (socket) => {
            console.log("A user connected");

            socket.on("notification", (data) => {
                console.log("Received notification data:", data);
                socket.emit("newNotification", data); // Phát lại dữ liệu tới tất cả client
            });

            socket.on("disconnect", () => {
                console.log("A user disconnected");
            });
        });

        console.log("Socket.IO server is initialized");
    } else {
        console.warn("Socket.IO server is already initialized.");
    }
};
