import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/likes.model.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

const extractHashtags = (text = "") => {

    const matches =
        text.match(
            /#[a-zA-Z0-9_]+/g
        ) || [];


    return [
        ...new Set(
            matches.map(
                tag =>
                    tag
                        .slice(1)
                        .toLowerCase()
            )
        )
    ];
};

export const createPost = async (req, res) => {
    try {
        const content = req.body.content?.trim() || "";
        let media = null;
        if (req.file) {

            const uploaded =
                await uploadToCloudinary(
                    req.file.buffer,
                    "nexus/posts",
                    "image"
                );


            media = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id,
                type: "image"
            };
        }

        if (!content && !media) {

            return res.status(400).json({

                message:
                    "Post cannot be empty"
            });
        }

        const post = await Post.create({
            author: req.user.userId,
            content,
            media,
            hashtags:
                extractHashtags(
                    content
                ),
            mentions: []
        });

        await User.findByIdAndUpdate(
            req.user.userId,
            {
                $inc: {
                    postsCount: 1
                }
            }
        );


        const populatedPost =
            await Post.findById(
                post._id
            )
                .populate(
                    "author",
                    "name username profile"
                );


        return res.status(201).json({
            message: "Post created successfully",
            post: populatedPost
        });


    } catch (error) {

        console.error(
            "Create post error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to create post",

            error:
                error.message
        });
    }
};
export const getPosts = async (req, res) => {

    try {

        const posts =
            await Post.find()
                .populate(
                    "author",
                    "name username profile"
                )
                .sort({
                    createdAt: -1
                })
                .lean();

        if (!posts.length) {

            return res.status(200).json({
                posts: []
            });
        }


        const postIds =
            posts.map(
                post => post._id
            );

        const likes =
            await Like.find({
                post: {
                    $in: postIds
                }
            })
                .populate(
                    "user",
                    "_id name username profile"
                )
                .lean();

        const likesByPost =
            new Map();


        for (const like of likes) {

            const postId =
                String(like.post);


            if (!likesByPost.has(postId)) {

                likesByPost.set(
                    postId,
                    []
                );
            }


            likesByPost
                .get(postId)
                .push(like);
        }

        const formattedPosts =
            posts.map(post => {

                const postLikes =
                    likesByPost.get(
                        String(post._id)
                    ) || [];


                const likedByCurrentUser =
                    postLikes.some(
                        like =>
                            String(
                                like.user?._id
                            ) ===
                            String(
                                req.user?.userId
                            )
                    );


                return {

                    ...post,

                    likesCount:
                        postLikes.length,

                    isLiked:
                        likedByCurrentUser,

                    likedBy:
                        postLikes
                            .filter(
                                like =>
                                    like.user
                            )
                            .map(
                                like => ({
                                    id:
                                        like.user._id,

                                    name:
                                        like.user.name ||
                                        "",

                                    username:
                                        like.user.username ||
                                        "",

                                    profile:
                                        like.user.profile ||
                                        ""
                                })
                            )
                };
            });


        return res.status(200).json({
            posts: formattedPosts
        });

    } catch (error) {
        console.error("Get posts error:", error);
        return res.status(500).json({
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

