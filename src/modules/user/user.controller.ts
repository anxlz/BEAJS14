import { Router } from "express";
import { successResponse } from "../../common/utils/index.js";
import { authentication, validation } from "../../middleware/index.js";
import { userService } from "./user.service.js";
import * as validators from "./user.validation.js";

const router = Router();

router.use(authentication());

// 1. Profile retrieval and updates
router.get("/profile", async (req, res) => {
    const data = await userService.getProfile(String(req.user._id));
    successResponse({ res, data });
});

router.patch("/profile", validation(validators.updateProfile), async (req, res) => {
    const data = await userService.updateProfile(String(req.user._id), req.validate.body);
    successResponse({ res, message: "Profile updated", data });
});

// 3. User search and suggestions
router.get("/search", validation(validators.searchUsers), async (req, res) => {
    const data = await userService.search(String(req.user._id), req.validate.query);
    successResponse({ res, data });
});

router.get("/suggestions", validation(validators.suggestions), async (req, res) => {
    const data = await userService.suggestions(String(req.user._id), req.validate.query);
    successResponse({ res, data });
});

// 2. Follow system (lists)
router.get("/followers", validation(validators.listConnections), async (req, res) => {
    const data = await userService.listConnections(String(req.user._id), "followers", req.validate.query);
    successResponse({ res, data });
});

router.get("/following", validation(validators.listConnections), async (req, res) => {
    const data = await userService.listConnections(String(req.user._id), "following", req.validate.query);
    successResponse({ res, data });
});

router.get("/follow-requests", validation(validators.listConnections), async (req, res) => {
    const data = await userService.listConnections(String(req.user._id), "followRequests", req.validate.query);
    successResponse({ res, data });
});

router.patch("/follow-requests/:userId", validation(validators.respondFollowRequest), async (req, res) => {
    const data = await userService.respondToFollowRequest(String(req.user._id), req.validate.params.userId, req.validate.body);
    successResponse({ res, message: `Follow request ${data.action}ed`, data });
});

// 4. Account settings and privacy control
router.get("/settings", async (req, res) => {
    const data = await userService.getSettings(String(req.user._id));
    successResponse({ res, data });
});

router.patch("/settings", validation(validators.updateSettings), async (req, res) => {
    const data = await userService.updateSettings(String(req.user._id), req.validate.body);
    successResponse({ res, message: "Settings updated", data });
});

router.patch("/change-password", validation(validators.changePassword), async (req, res) => {
    const data = await userService.changePassword(String(req.user._id), req.validate.body);
    successResponse({ res, message: "Password changed, please login again", data });
});

// Dynamic routes stay last
router.get("/:userId", validation(validators.userIdOnly), async (req, res) => {
    const data = await userService.getUserProfile(String(req.user._id), req.validate.params.userId);
    successResponse({ res, data });
});

router.post("/:userId/follow", validation(validators.userIdOnly), async (req, res) => {
    const data = await userService.follow(String(req.user._id), req.validate.params.userId);
    successResponse({ res, status: 201, message: data.status === "pending" ? "Follow request sent" : "You are now following this user", data });
});

router.delete("/:userId/follow", validation(validators.userIdOnly), async (req, res) => {
    const data = await userService.unfollow(String(req.user._id), req.validate.params.userId);
    successResponse({ res, message: "Unfollowed", data });
});

export default router;
