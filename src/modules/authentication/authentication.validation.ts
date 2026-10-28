import { z } from "zod";
import { generalValidationFields } from "../../common/utils/validation.js";

const { username, email, password, phone, otp } = generalValidationFields;

const passwordsMatch = (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword;

export const signup = z.object({
    body: z
        .strictObject({
            username,
            email,
            password,
            confirmPassword: password,
            phone: phone.optional()
        })
        .refine(passwordsMatch, { path: ["confirmPassword"], message: "password and confirmPassword must match" })
});

export const confirmEmail = z.object({
    body: z.strictObject({ email, otp })
});

export const resendConfirmEmail = z.object({
    body: z.strictObject({ email })
});

export const login = z.object({
    body: z.strictObject({ email, password })
});

export const loginWithGmail = z.object({
    body: z.strictObject({ idToken: z.string().min(20) })
});

export const logout = z.object({
    body: z.strictObject({ action: z.union([z.literal(0), z.literal(1)]).optional() })
});

export const forgotPassword = z.object({
    body: z.strictObject({ email })
});

export const resetPassword = z.object({
    body: z
        .strictObject({
            email,
            otp,
            password,
            confirmPassword: password
        })
        .refine(passwordsMatch, { path: ["confirmPassword"], message: "password and confirmPassword must match" })
});
