import express from "express";

import {createComment,getPostComments,updateComment,deleteComment,} from "../controllers/comment.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createComment);
router.get("/post/:postId", getPostComments);
router.patch("/:id", authMiddleware, updateComment);
router.delete("/:id",authMiddleware, deleteComment);

export default router;