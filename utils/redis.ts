import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.development') });

let redisClient;

const connectRedis = () => {
    if (!redisClient) {
        if (process.env.REDIS_URL) {
            console.log('Kết nối tới Redis...');
            redisClient = new Redis(process.env.REDIS_URL);

            redisClient.on('connect', () => {
                console.log('Redis đã kết nối thành công!');
            });

            redisClient.on('error', (err) => {
                console.error('Kết nối Redis thất bại:', err);
            });
        } else {
            throw new Error('REDIS_URL không được cấu hình trong file .env');
        }
    }
    return redisClient; //trả về redis client
};

export default connectRedis; 
