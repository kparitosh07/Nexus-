import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";


export const createComment = async (req, res) => {
  try {
    const {
      post,
      content,
      parentComment = null
    } = req.body;

    if (!post || !content?.trim()) {
      return res.status(400).json({
        message: "Post and comment content are required"
      });
    }

    const postExists = await Post.findById(post);

    if (!postExists) {
      return res.status(404).json({
        message: "Post not found"
      });
    }

    if (parentComment) {

      const parent = await Comment.findById(parentComment);

      if (!parent) {
        return res.status(404).json({
          message: "Parent comment not found"
        });
      }

      if (String(parent.post) !== String(post)) {
        return res.status(400).json({
          message: "Parent comment does not belong to this post"
        });
      }
    }

    const comment = await Comment.create({
      post,
      author: req.user.userId,
      content: content.trim(),
      parentComment
    });

    if (parentComment) {
      await Comment.findByIdAndUpdate(
        parentComment,
        {
          $inc: {
            repliesCount: 1
          }
        }
      );
    }

    await Post.findByIdAndUpdate(
      post,
      {
        $inc: {
          commentsCount: 1
        }
      }
    );

    await comment.populate(
      "author",
      "name username profile"
    );

    res.status(201).json({
      message: parentComment
        ? "Reply created successfully"
        : "Comment created successfully",
      comment
    });

  } catch (error) {

    console.error("Create comment error:", error);

    res.status(500).json({
      message: "Failed to create comment",
      error: error.message
    });
  }
};

export const getPostComments = async (req, res) => {
  try {

    const comments = await Comment.find({
      post: req.params.postId
    })
      .populate(
        "author",
        "name username profile"
      )
      .sort({
        createdAt: 1
      })
      .lean();

    res.status(200).json({
      comments
    });

  } catch (error) {

    console.error("Get comments error:", error);

    res.status(500).json({
      message: "Failed to get comments",
      error: error.message
    });
  }
};

export const updateComment = async (req, res) => {
  try {

    const comment = await Comment.findById(
      req.params.id
    );

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    if (
      String(comment.author) !==
      String(req.user.userId)
    ) {
      return res.status(403).json({
        message: "You can only update your own comment"
      });
    }

    const content =
      req.body.content?.trim();

    if (!content) {
      return res.status(400).json({
        message: "Comment content cannot be empty"
      });
    }

    comment.content = content;

    await comment.save();

    await comment.populate(
      "author",
      "name username profile"
    );

    res.status(200).json({
      message: "Comment updated successfully",
      comment
    });

  } catch (error) {

    console.error("Update comment error:", error);

    res.status(500).json({
      message: "Failed to update comment",
      error: error.message
    });
  }
};

export const deleteComment = async (req, res) => {
  try {

    const comment = await Comment.findById(
      req.params.id
    );

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    if (
      String(comment.author) !==
      String(req.user.userId)
    ) {
      return res.status(403).json({
        message: "You can only delete your own comment"
      });
    }

    const deletedComments =
      await Comment.deleteMany({
        $or: [
          { _id: comment._id },
          { parentComment: comment._id }
        ]
      });

    await Post.findByIdAndUpdate(
      comment.post,
      {
        $inc: {
          commentsCount: -deletedComments.deletedCount
        }
      }
    );

    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(
        comment.parentComment,
        {
          $inc: {
            repliesCount: -1
          }
        }
      );
    }

    res.status(200).json({
      message: "Comment deleted successfully"
    });

  } catch (error) {

    console.error("Delete comment error:", error);

    res.status(500).json({
      message: "Failed to delete comment",
      error: error.message
    });
  }
};