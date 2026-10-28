import type { Types } from "mongoose";
import type { GenderEnum, ProviderEnum } from "../enum/index.js";

export interface IUser {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    phone?: string;
    bio?: string;
    image?: string;
    gender: GenderEnum;
    provider: ProviderEnum;
    confirmEmail?: Date | null;
    changeCredentialsTime?: Date | null;
    isPrivate: boolean;
    followers: Types.ObjectId[];
    following: Types.ObjectId[];
    followRequests: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}
