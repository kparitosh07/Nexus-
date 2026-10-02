import express from "express";
import {createUser,getUsers,getUser,updateOwnProfile,updateUser,deleteUser,} from "../controllers/user.controller.js";
import upload from "../middleware/upload.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUser);
router.patch("/profile",authMiddleware,upload.single("profile"),updateOwnProfile);
router.patch("/:id",  authMiddleware,updateUser);
router.delete("/:id", deleteUser);

export default router;