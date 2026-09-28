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

export const checkFollowStatus = async (req, res) => {
    try {
        const followerId = req.user.userId;
        const followingId = req.params.id;

        const follow = await Follow.findOne({
            follower: followerId,
            following: followingId,
        });

        res.json({
            success: true,
            following: !!follow,
        });
    } catch (error) {
        console.error("Check follow status error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getMyFollowing = async (req, res) => {
    try {
        const userId = req.user.userId;

        const following = await Follow.find({
            follower: userId,
        }).populate(
            "following",
            "name username profile followersCount followingCount"
        ).lean();

        const users = following.map((item) => item.following).filter(Boolean);

        await User.findByIdAndUpdate(userId, {
            followingCount: users.length
        });

        res.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error("Get following error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getFollowers = async (req, res) => {
    try {
        const userId = req.params.id;

        const followers = await Follow.find({
            following: userId,
        }).populate(
            "follower",
            "name username profile followersCount followingCount"
        ).lean();

        const users = followers.map((item) => item.follower).filter(Boolean);

        await User.findByIdAndUpdate(userId, {
            followersCount: users.length
        });

        res.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error("Get followers error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getFollowing = async (req, res) => {
    try {
        const userId = req.params.id;

        const following = await Follow.find({
            follower: userId,
        }).populate(
            "following",
            "name username profile followersCount followingCount"
        ).lean();

        const users = following.map((item) => item.following).filter(Boolean);

        res.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error("Get user following error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};