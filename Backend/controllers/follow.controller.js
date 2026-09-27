import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";

export const followUser = async (req, res) => {
    try {
        const followerId = req.user.userId;
        const followingId = req.params.id;

        if (followerId === followingId) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }

        const user = await User.findById(followingId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const existingFollow = await Follow.findOne({
            follower: followerId,
            following: followingId
        });

        if (existingFollow) {
            return res.status(409).json({
                message: "Already following this user"
            });
        }

        const follow = await Follow.create({
            follower: followerId,
            following: followingId
        });

        await User.findByIdAndUpdate(followerId, {
            $inc: { followingCount: 1 }
        });

        await User.findByIdAndUpdate(followingId, {
            $inc: { followersCount: 1 }
        });

        res.status(201).json({
            message: "User followed successfully",
            follow
        });

    } catch (error) {
        console.error("Follow error:", error);

        res.status(500).json({
            message: "Failed to follow user",
            error: error.message
        });
    }
};

export const unfollowUser = async (req, res) => {
    try {
        const followerId = req.user.userId;
        const followingId = req.params.id;

        const follow = await Follow.findOneAndDelete({
            follower: followerId,
            following: followingId
        });

        if (!follow) {
            return res.status(404).json({
                message: "You are not following this user"
            });
        }

        await User.findByIdAndUpdate(followerId, {
            $inc: { followingCount: -1 }
        });

        await User.findByIdAndUpdate(followingId, {
            $inc: { followersCount: -1 }
        });

        res.status(200).json({
            message: "User unfollowed successfully"
        });

    } catch (error) {
        console.error("Unfollow error:", error);

        res.status(500).json({
            message: "Failed to unfollow user",
            error: error.message
        });
    }
};