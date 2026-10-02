import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import { deleteFromCloudinary } from "../utils/cloudinaryUpload.js";

export const createUser = async (req, res) => {
  try {
    const { dob, name, username, password, bio, profile } = req.body;

    const user = await User.create({
      dob,
      name,
      username,
      password,
      bio,
      profile,
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to create user",
      error: error.message
    });
  };
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get users",
      error: error.message,
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get user",
      error: error.message,
    });
  }
};

export const updateOwnProfile = async (
  req,
  res
) => {

  try {

    const user =
      await User.findById(
        req.user.userId
      );


    if (!user) {

      return res.status(404).json({

        message:
          "User not found"
      });
    }


    const name =
      req.body.name?.trim();


    const bio =
      req.body.bio?.trim();


    if (name !== undefined) {

      if (!name) {

        return res.status(400).json({

          message:
            "Name cannot be empty"
        });
      }

      user.name = name;
    }


    if (bio !== undefined) {

      user.bio = bio;
    }

    if (req.file) {

      const uploaded =
        await uploadToCloudinary(
          req.file.buffer,
          "nexus/profiles",
          "image"
        );

      if (user.profilePublicId) {

        try {

          await deleteFromCloudinary(
            user.profilePublicId,
            "image"
          );

        } catch (deleteError) {

          console.error(
            "Old profile image deletion error:",
            deleteError
          );
        }
      }


      user.profile = uploaded.secure_url;


      user.profilePublicId = uploaded.public_id;
    }
    await user.save();
    return res.status(200).json({
      message: "Profile updated successfully",
      user
    });


  } catch (error) {

    console.error(
      "Update profile error:",
      error
    );


    return res.status(500).json({
      message: "Failed to update profile",
      error: error.message
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: "after"
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
};


export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
};