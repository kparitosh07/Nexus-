import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  dob: {
    type: Date
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: true
  },

  bio: {
    type: String,
    maxlength: 160,
    default: "",
  },

  profile: {
    type: String
  },

  followersCount: {
    type: Number,
    default: 0,
  },

  followingCount: {
    type: Number,
    default: 0,
  },

  postsCount: {
    type: Number,
    default: 0,
  },

  isOnline: {
    type: Boolean,
    default: false,
  },
},
  {
    timestamps: true
  });

export const User = mongoose.model("User", userSchema);