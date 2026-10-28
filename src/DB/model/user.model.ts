import { model, Schema } from "mongoose";
import { GenderEnum, ProviderEnum } from "../../common/enum/index.js";
import type { IUser } from "../../common/interface/index.js";

const userSchema = new Schema<IUser>(
    {
        firstName: { type: String, required: true, minlength: 2, maxlength: 25, trim: true },
        lastName: { type: String, required: true, minlength: 2, maxlength: 25, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: {
            type: String,
            select: false,
            required: function (this: any) {
                return this.provider === ProviderEnum.SYSTEM;
            }
        },
        phone: { type: String },
        bio: { type: String, maxlength: 200, trim: true },
        image: { type: String },
        gender: { type: Number, enum: [GenderEnum.MALE, GenderEnum.FEMALE], default: GenderEnum.MALE },
        provider: { type: Number, enum: [ProviderEnum.SYSTEM, ProviderEnum.GOOGLE], default: ProviderEnum.SYSTEM },
        confirmEmail: { type: Date, default: null },
        changeCredentialsTime: { type: Date, default: null },
        isPrivate: { type: Boolean, default: false },
        followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
        following: [{ type: Schema.Types.ObjectId, ref: "User" }],
        followRequests: [{ type: Schema.Types.ObjectId, ref: "User" }]
    },
    { timestamps: true }
);

userSchema.index({ firstName: 1, lastName: 1 });

export const UserModel = model<IUser>("User", userSchema);
