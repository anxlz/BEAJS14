import { z } from "zod";
import * as validators from "../authentication.validation.js";

export type SignupDto = z.infer<typeof validators.signup>["body"];
export type ConfirmEmailDto = z.infer<typeof validators.confirmEmail>["body"];
export type ResendConfirmEmailDto = z.infer<typeof validators.resendConfirmEmail>["body"];
export type LoginDto = z.infer<typeof validators.login>["body"];
export type LoginWithGmailDto = z.infer<typeof validators.loginWithGmail>["body"];
export type LogoutDto = z.infer<typeof validators.logout>["body"];
export type ForgotPasswordDto = z.infer<typeof validators.forgotPassword>["body"];
export type ResetPasswordDto = z.infer<typeof validators.resetPassword>["body"];
