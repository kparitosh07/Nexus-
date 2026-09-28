import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";

export const createUser = async (req,res) => {
    try {
        const { dob, name , username , password ,bio , profile } = req.body;

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


export const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true
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