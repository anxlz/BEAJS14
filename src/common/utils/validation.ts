import { z } from "zod";

export const fullNameRegex = /^[A-Z][a-z]{1,24}\s[A-Z][a-z]{1,24}$/;
export const phoneRegex = /^01[0-25]\d{8}$/;
export const emailRegex = /^(?=.*[a-zA-Z]{5,25})(?=.*[0-9]{0,5}).{5,50}@(gmail|yahoo|icloud)(\.com|\.net){1,2}$/;
export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const generalValidationFields = {
    username: z.string().regex(fullNameRegex, "username must be First Last, like Mahmoud Elwan"),
    email: z.string().regex(emailRegex, "enter a valid gmail/yahoo/icloud address"),
    password: z.string().min(6).max(64),
    phone: z.string().regex(phoneRegex, "enter a valid egyptian phone number, like 01012345678"),
    otp: z.coerce.string().regex(/^\d{6}$/, "otp must be 6 digits"),
    objectId: z.string().regex(objectIdRegex, "invalid id")
};
