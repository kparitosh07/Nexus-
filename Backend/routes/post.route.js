import express from "express";

import {createPost,getPosts,getPost,updatePost,deletePost,} from "../controllers/post.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/",authMiddleware ,upload.single("image"), createPost);
router.get("/", authMiddleware, getPosts);
router.get("/:id", getPost);
router.patch("/:id", authMiddleware, updatePost);
router.delete("/:id", authMiddleware, deletePost);


export default router;