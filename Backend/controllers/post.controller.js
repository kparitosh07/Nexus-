import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";

export const createPost = async (req, res) => {
    try {
        const { content, media, hashtags, mentions } = req.body;

        if (!content?.trim() && !media?.url) {
            return res.status(400).json({
                message: "Post cannot be empty"
            });
        }

        const post = await Post.create({
            author: req.user.userId,
            content: content?.trim() || "",
            media,
            hashtags,
            mentions
        });

        await User.findByIdAndUpdate(req.user.userId, {
            $inc: { postsCount: 1 }
        });

        const populatedPost = await Post.findById(post._id)
            .populate("author", "name username profile");

        res.status(201).json({
            message: "Post created successfully",
            post: populatedPost
        });

    } catch (error) {
        console.error("Create post error:", error);

        res.status(500).json({
            message: "Failed to create post",
            error: error.message
        });
    }
};

export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "name username profile")
            .sort({ createdAt: -1 });

        res.status(200).json({
            posts
        });

    } catch (error) {
        console.error("Get posts error:", error);

        res.status(500).json({
            message: "Failed to get posts",
            error: error.message
        });
    }
};

export const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("author", "name username profile");

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        res.status(200).json({
            post
        });

    } catch (error) {
        console.error("Get post error:", error);

        res.status(500).json({
            message: "Failed to get post",
            error: error.message
        });
    }
};

export const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({
                message: "You can only update your own post"
            });
        }

        const { content, media, hashtags, mentions } = req.body;

        post.content = content;
        post.media = media;
        post.hashtags = hashtags;
        post.mentions = mentions;

        await post.save();

        res.status(200).json({
            message: "Post updated successfully",
            post
        });

    } catch (error) {
        console.error("Update post error:", error);

        res.status(500).json({
            message: "Failed to update post",
            error: error.message
        });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({
                message: "You can only delete your own post"
            });
        }

        await post.deleteOne();

        await User.findByIdAndUpdate(req.user.userId, {
            $inc: { postsCount: -1 }
        });

        res.status(200).json({
            message: "Post deleted successfully"
        });

    } catch (error) {
        console.error("Delete post error:", error);

        res.status(500).json({
            message: "Failed to delete post",
            error: error.message
        });
    }
};

