import mongoose from "mongoose";

import { Like } from "../models/likes.model.js";
import { Post } from "../models/post.model.js";

export const toggleLike = async (req, res) => {

    try {

        const { postId } = req.params;

        const userId = req.user.userId;

        if (!mongoose.Types.ObjectId.isValid(postId)) {

            return res.status(400).json({
                message: "Invalid post ID"
            });

        }

        const post =
            await Post.findById(postId);

        if (!post) {

            return res.status(404).json({
                message: "Post not found"
            });

        }

        const existingLike =
            await Like.findOne({
                user: userId,
                post: postId
            });

        if (existingLike) {

            await Like.deleteOne({
                _id: existingLike._id
            });


            const updatedPost =
                await Post.findByIdAndUpdate(
                    postId,
                    {
                        $inc: {
                            likesCount: -1
                        }
                    },
                    {
                        returnDocument: "after"
                    }
                );


            return res.status(200).json({
                message: "Post unliked",
                liked: false,
                likesCount:
                    Math.max(updatedPost.likesCount,0)
            });
        }


        await Like.create({
            user: userId,
            post: postId
        });


        const updatedPost =
            await Post.findByIdAndUpdate(
                postId,
                {
                    $inc: {
                        likesCount: 1
                    }
                },
                {
                    returnDocument: "after"
                }
            );

        return res.status(200).json({
            message: "Post liked",
            liked: true,
            likesCount: updatedPost.likesCount
        });


    } catch (error) {

        console.error(
            "Toggle like error:",
            error
        );

        if (error.code === 11000) {

            return res.status(409).json({
                message: "Post already liked"
            });
        }


        return res.status(500).json({

            message:
                "Failed to like/unlike post",

            error: error.message
        });
    }
};

export const getPostLikes = async (req, res) => {
    try {
        const { postId } = req.params;

        if (
            !mongoose.Types.ObjectId
                .isValid(postId)
        ) {

            return res.status(400).json({
                message: "Invalid post ID"
            });
        }


        const likes =
            await Like.find({
                post: postId
            })
            .populate(
                "user",
                "_id name username profile"
            )
            .sort({createdAt: -1})
            .lean();


        const users =
            likes
                .filter(like => like.user)
                .map(like => ({
                    id: like.user._id,
                    name: like.user.name || "",
                    username: like.user.username || "",
                    profile: like.user.profile || "",
                    likedAt: like.createdAt
                }));


        return res.status(200).json({
            likesCount:users.length,
            users
        });


    } catch (error) {

        console.error(
            "Get post likes error:",
            error
        );


        return res.status(500).json({
            message:"Failed to get post likes",
            error:error.message
        });
    }
};