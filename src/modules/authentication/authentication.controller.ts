import { Router } from "express";
import type { Request } from "express";
import { TokenTypeEnum } from "../../common/enum/index.js";
import { successResponse } from "../../common/utils/index.js";
import { authentication, validation } from "../../middleware/index.js";
import { authenticationService } from "./authentication.service.js";
import * as validators from "./authentication.validation.js";

const router = Router();

const issuerOf = (req: Request): string => `${req.protocol}://${req.get("host")}`;

// 1. Registration and email verification
router.post("/signup", validation(validators.signup), async (req, res) => {
    const data = await authenticationService.signup(req.validate.body);
    successResponse({ res, status: 201, message: "Account created, please check your email for the code", data });
});

router.patch("/confirm-email", validation(validators.confirmEmail), async (req, res) => {
    const data = await authenticationService.confirmEmail(req.validate.body);
    successResponse({ res, message: "Email confirmed successfully", data });
});

router.patch("/resend-confirm-email", validation(validators.resendConfirmEmail), async (req, res) => {
    const data = await authenticationService.resendConfirmEmail(req.validate.body);
    successResponse({ res, message: "A new code was sent to your email", data });
});

// 2. Login and session generation
router.post("/login", validation(validators.login), async (req, res) => {
    const data = await authenticationService.login(req.validate.body, issuerOf(req));
    successResponse({ res, message: "Logged in successfully", data });
});

// 5. Google sign-in
router.post("/login-with-gmail", validation(validators.loginWithGmail), async (req, res) => {
    const data = await authenticationService.loginWithGmail(req.validate.body, issuerOf(req));
    successResponse({ res, message: "Logged in successfully", data });
});

// 3. Token refreshing (send the refresh token as Bearer)
router.post("/rotate-token", authentication(TokenTypeEnum.REFRESH), async (req, res) => {
    const data = await authenticationService.rotateToken({ user: req.user, payload: req.payload }, issuerOf(req));
    successResponse({ res, message: "Token refreshed", data });
});

// 3. Token revocation
router.post("/logout", authentication(), validation(validators.logout), async (req, res) => {
    const data = await authenticationService.logout({ user: req.user, payload: req.payload }, req.validate.body);
    successResponse({ res, message: "Logged out successfully", data });
});

// 4. Password reset
router.post("/forgot-password", validation(validators.forgotPassword), async (req, res) => {
    const data = await authenticationService.forgotPassword(req.validate.body);
    successResponse({ res, message: "If the account exists, a code was sent to the email", data });
});

router.patch("/reset-password", validation(validators.resetPassword), async (req, res) => {
    const data = await authenticationService.resetPassword(req.validate.body);
    successResponse({ res, message: "Password reset successfully, please login again", data });
});

export default router;
