import express from "express";

import {
    followUser,
    unfollowUser
} from "../controllers/follow.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:id", authMiddleware, followUser);

router.delete("/:id", authMiddleware, unfollowUser);

export default router;