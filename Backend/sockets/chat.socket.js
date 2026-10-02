import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";

export const registerChatHandlers = (socket, io, onlineUsers) => {
    socket.on("load-messages", async (receiverId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(receiverId)) {
                return;
            }
            const messages = await Message.find({
                $or: [
                    {
                        senderId: socket.userId,
                        receiverId
                    },
                    {
                        senderId: receiverId,
                        receiverId: socket.userId
                    }
                ]
            }).sort({ createdAt: 1 }).lean();

            const messageData = await Promise.all(
                messages.map(async (message) => {

                    const sender = await User.findById(
                        message.senderId
                    ).select("profile").lean();

                    return {
                        id: message._id.toString(),
                        senderId: message.senderId.toString(),
                        receiverId: message.receiverId.toString(),
                        senderName: message.senderName || "",
                        senderProfile: sender?.profile || "",
                        message: message.message,
                        createdAt: message.createdAt
                    };
                })
            );

            socket.emit("chat-history", messageData);

        } catch (error) {
            console.log(
                "Chat history error:",
                error
            );
        }
    });

    socket.on("load-following", async () => {

        try {

            const following = await Follow.find({
                follower: socket.userId
            })
                .populate("following","_id name username profile")
                .lean();

            const users = following
                .map(item => item.following)
                .filter(Boolean)
                .map(user => ({
                    id: user._id.toString(),
                    name: user.name || "",
                    username: user.username,
                    profile: user.profile || "",
                    online: onlineUsers.has(
                        user._id.toString()
                    )
                }));

            socket.emit("following-list",users);
        } catch (error) {
            console.error("Load following error:",error);
            socket.emit(
                "following-list",
                []
            );
        }
    });

    socket.on("load-chat-list", async () => {
        try {
            const messages = await Message.find({
                $or: [
                    { senderId: socket.userId },
                    { receiverId: socket.userId }
                ]
            }).sort({ createdAt: -1 }).lean();

            const chatUsers = new Map();

            for (const message of messages) {
                const otherUserId = message.senderId.toString() === socket.userId ? message.receiverId.toString() : message.senderId.toString();

                if (!chatUsers.has(otherUserId)) {
                    const user = await User.findById(otherUserId).select("_id username profile").lean();

                    if (user) {
                        chatUsers.set(otherUserId, {
                            id: user._id.toString(),
                            username: user.username,
                            profile: user.profile,
                            online: onlineUsers.has(
                                user._id.toString()
                            )
                        });
                    }
                }
            }
            socket.emit("chat-list", [...chatUsers.values()]);
        } catch (error) {
            console.log("Chat list error:", error);
        }
    });

    socket.on(
    "private-message",
    async (data) => {

        try {

            const {
                receiverId,
                message
            } = data;


            if (
                !receiverId ||
                !message?.trim()
            ) {
                return;
            }


            if (
                !mongoose.Types.ObjectId
                    .isValid(receiverId)
            ) {
                return;
            }


            const receiver =
                await User.findById(
                    receiverId
                )
                .select(
                    "_id name username profile"
                )
                .lean();


            if (!receiver) {
                return;
            }


            const newMessage =
                await Message.create({

                    senderId:
                        socket.userId,

                    receiverId:
                        receiverId,

                    senderName:
                        socket.name ||
                        socket.username,

                    message:
                        message.trim()
                });


            const messageData = {

                id:
                    newMessage._id
                        .toString(),

                senderId:
                    socket.userId,

                receiverId:
                    receiverId,

                senderName:
                    socket.name ||
                    socket.username,

                senderProfile:
                    socket.profile || "",

                message:
                    newMessage.message,

                createdAt:
                    newMessage.createdAt
            };


            // Sender
            socket.emit(
                "private-message",
                messageData
            );


            // Receiver
            io.to(
                `user:${receiverId}`
            ).emit(
                "private-message",
                messageData
            );


            // Add receiver to sender inbox
            socket.emit(
                "chat-added",
                {
                    id:
                        receiver._id
                            .toString(),

                    name:
                        receiver.name || "",

                    username:
                        receiver.username,

                    profile:
                        receiver.profile || "",

                    online:
                        onlineUsers.has(
                            receiverId
                        )
                }
            );


            // Add sender to receiver inbox
            io.to(
                `user:${receiverId}`
            ).emit(
                "chat-added",
                {
                    id:
                        socket.userId,

                    name:
                        socket.name || "",

                    username:
                        socket.username,

                    profile:
                        socket.profile || "",

                    online:
                        true
                }
            );

        } catch (error) {

            console.error(
                "Message error:",
                error
            );

        }
    }
);
};