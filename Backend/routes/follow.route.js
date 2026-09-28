import express from "express";

import {followUser,unfollowUser,checkFollowStatus,getMyFollowing,getFollowers,getFollowing} from "../controllers/follow.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:id", authMiddleware, followUser);

router.delete("/:id", authMiddleware, unfollowUser);

router.get("/status/:id",authMiddleware,checkFollowStatus);

router.get("/me/following",authMiddleware,getMyFollowing);
 
router.get("/:id/followers",authMiddleware,getFollowers);

router.get("/:id/following",authMiddleware,getFollowing);

export default router;