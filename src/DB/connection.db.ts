import mongoose from "mongoose";
import { DB_URI } from "../config.js";
import { cacheService } from "../common/service/index.js";
import { UserModel } from "./model/index.js";

export const connectDB = async (): Promise<void> => {
    await mongoose.connect(DB_URI);
    await UserModel.syncIndexes();
    console.log("DB connected");
};

export const connectRedis = async (): Promise<void> => {
    await cacheService.connect();
};
