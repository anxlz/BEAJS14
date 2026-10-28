import { z } from "zod";
import { FollowActionEnum } from "../../common/enum/index.js";
import { generalValidationFields } from "../../common/utils/validation.js";

const { username, phone, password, objectId } = generalValidationFields;

const userIdParams = z.strictObject({ userId: objectId });

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(10);

export const updateProfile = z.object({
    body: z
        .strictObject({
            username: username.optional(),
            phone: phone.optional(),
            bio: z.string().trim().max(200).optional(),
            gender: z.union([z.literal(0), z.literal(1)]).optional()
        })
        .refine((data) => Object.keys(data).length > 0, { message: "at least one field is required" })
});

export const userIdOnly = z.object({
    params: userIdParams
});

export const searchUsers = z.object({
    query: z.strictObject({ q: z.string().trim().min(2).max(50), page, limit })
});

export const suggestions = z.object({
    query: z.strictObject({ limit })
});

export const listConnections = z.object({
    query: z.strictObject({ page, limit })
});

export const respondFollowRequest = z.object({
    params: userIdParams,
    body: z.strictObject({ action: z.enum([FollowActionEnum.ACCEPT, FollowActionEnum.REJECT]) })
});

export const updateSettings = z.object({
    body: z.strictObject({ isPrivate: z.boolean() })
});

export const changePassword = z.object({
    body: z
        .strictObject({
            oldPassword: password,
            password,
            confirmPassword: password
        })
        .refine((data) => data.password === data.confirmPassword, {
            path: ["confirmPassword"],
            message: "password and confirmPassword must match"
        })
        .refine((data) => data.password !== data.oldPassword, {
            path: ["password"],
            message: "new password must be different from the old one"
        })
});
