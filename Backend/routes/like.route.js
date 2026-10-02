import express from "express";

import {
    toggleLike,
    getPostLikes
} from "../controllers/like.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";


const router =express.Router();

router.post("/:postId",authMiddleware,toggleLike);
router.get("/:postId",authMiddleware,getPostLikes);

export default router;