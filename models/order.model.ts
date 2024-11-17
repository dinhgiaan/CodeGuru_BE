import mongoose, { Document, Model, Schema } from "mongoose";


interface IThumbnail {
    public_id: string,
    url: string
}
export interface IOrder extends Document {
    courseId: string,
    name: string,
    price: number,
    thumbnail: IThumbnail,
    userId?: string,
    payment_info: object
}

const orderSchema = new Schema<IOrder>({
    courseId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    thumbnail: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    userId: {
        type: String,
        required: true
    },
    payment_info: {
        type: Object
    }
}, { timestamps: true });

const OrderModel: Model<IOrder> = mongoose.model('Order', orderSchema);

export default OrderModel;