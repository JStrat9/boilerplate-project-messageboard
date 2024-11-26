"use strict";

const BoardModel = require("../models").Board;
const ThreadModel = require("../models").Thread;
const ReplyModel = require("../models").Reply;

module.exports = function (app) {
    app.route("/api/threads/:board")
        .post(async (req, res) => {
            const { text, delete_password } = req.body;
            const board = req.params.board;
            const newThread = new ThreadModel({
                text: text,
                delete_password: delete_password,
                replies: [],
                created_on: new Date(),
                bumped_on: new Date(),
                reported: false,
            });
            try {
                let boardData = await BoardModel.findOne({
                    name: board,
                }).exec();
                if (!boardData) {
                    const newBoard = new BoardModel({
                        name: board,
                        threads: [newThread],
                    });
                    await newBoard.save();
                } else {
                    boardData.threads.push(newThread);
                    await boardData.save();
                }
                res.json(newThread);
            } catch (err) {
                res.status(500).send("Error saving the thread");
            }
        })
        .get(async (req, res) => {
            const board = req.params.board;
            try {
                const data = await BoardModel.findOne({ name: board }).exec();
                if (!data) {
                    res.json({ error: "Board not found" });
                } else {
                    const threads = data.threads
                        .map((thread) => ({
                            _id: thread._id,
                            text: thread.text,
                            created_on: thread.created_on,
                            bumped_on: thread.bumped_on,
                            replies: thread.replies.slice(-3).map((reply) => ({
                                _id: reply._id,
                                text: reply.text,
                                created_on: reply.created_on,
                            })),
                            replycount: thread.replies.length,
                        }))
                        .sort(
                            (a, b) =>
                                new Date(b.bumped_on) - new Date(a.bumped_on)
                        )
                        .slice(0, 10);
                    res.json(threads);
                }
            } catch (err) {
                res.status(500).send("Error fetching the board");
            }
        })
        .put(async (req, res) => {
            const { thread_id } = req.body;
            const board = req.params.board;
            try {
                const boardData = await BoardModel.findOne({
                    name: board,
                }).exec();
                if (!boardData) {
                    res.json({ error: "Board not found" });
                } else {
                    const thread = boardData.threads.id(thread_id);
                    if (thread) {
                        thread.reported = true;
                        await boardData.save();
                        res.send("reported");
                    } else {
                        res.json({ error: "Thread not found" });
                    }
                }
            } catch (err) {
                res.status(500).send("Error reporting the thread");
            }
        })
        .delete(async (req, res) => {
            const { thread_id, delete_password } = req.body;
            const board = req.params.board;
            try {
                const boardData = await BoardModel.findOne({
                    name: board,
                }).exec();
                if (!boardData) {
                    res.json({ error: "Board not found" });
                } else {
                    const thread = boardData.threads.id(thread_id);
                    if (thread && thread.delete_password === delete_password) {
                        boardData.threads.pull(thread_id);
                        await boardData.save();
                        res.send("success");
                    } else {
                        res.send("incorrect password");
                    }
                }
            } catch (err) {
                res.status(500).send("Error deleting the thread");
            }
        });

    app.route("/api/replies/:board")
        .post(async (req, res) => {
            const { thread_id, text, delete_password } = req.body;
            const board = req.params.board;
            const currentDate = new Date();
            const newReply = new ReplyModel({
                text: text,
                delete_password: delete_password,
                created_on: currentDate,
                reported: false,
            });
            try {
                const boardData = await BoardModel.findOne({
                    name: board,
                }).exec();
                if (!boardData) {
                    res.json({ error: "Board not found" });
                } else {
                    const thread = boardData.threads.id(thread_id);
                    if (thread) {
                        thread.bumped_on = currentDate;
                        thread.replies.push(newReply);
                        await boardData.save();
                        res.json({
                            _id: newReply._id,
                            text: newReply.text,
                            created_on: newReply.created_on,
                            delete_password: newReply.delete_password,
                            reported: newReply.reported,
                        });
                    } else {
                        res.json({ error: "Thread not found" });
                    }
                }
            } catch (err) {
                res.status(500).send("Error adding the reply");
            }
        })
        .get(async (req, res) => {
            const board = req.params.board;
            const thread_id = req.query.thread_id;
            try {
                const data = await BoardModel.findOne({ name: board }).exec();
                if (!data) {
                    res.json({ error: "Board not found" });
                } else {
                    const thread = data.threads.id(thread_id);
                    if (thread) {
                        const threadData = {
                            _id: thread._id,
                            text: thread.text,
                            created_on: thread.created_on,
                            bumped_on: thread.bumped_on,
                            replies: thread.replies.map((reply) => ({
                                _id: reply._id,
                                text: reply.text,
                                created_on: reply.created_on,
                            })),
                            replycount: thread.replies.length,
                        };
                        res.json(threadData);
                    } else {
                        res.json({ error: "Thread not found" });
                    }
                }
            } catch (err) {
                res.status(500).send("Error fetching the thread");
            }
        })
        .put(async (req, res) => {
            const { thread_id, reply_id } = req.body;
            const board = req.params.board;
            try {
                const boardData = await BoardModel.findOne({
                    name: board,
                }).exec();
                if (!boardData) {
                    res.json({ error: "Board not found" });
                } else {
                    const thread = boardData.threads.id(thread_id);
                    if (thread) {
                        const reply = thread.replies.id(reply_id);
                        if (reply) {
                            reply.reported = true;
                            await boardData.save();
                            res.send("reported");
                        } else {
                            res.json({ error: "Reply not found" });
                        }
                    } else {
                        res.json({ error: "Thread not found" });
                    }
                }
            } catch (err) {
                res.status(500).send("Error reporting the reply");
            }
        })
        .delete(async (req, res) => {
            const { thread_id, reply_id, delete_password } = req.body;
            const board = req.params.board;
            try {
                const boardData = await BoardModel.findOne({
                    name: board,
                }).exec();
                if (!boardData) {
                    res.json({ error: "Board not found" });
                } else {
                    const thread = boardData.threads.id(thread_id);
                    if (thread) {
                        const reply = thread.replies.id(reply_id);
                        if (
                            reply &&
                            reply.delete_password === delete_password
                        ) {
                            reply.text = "[deleted]";
                            await boardData.save();
                            res.send("success");
                        } else {
                            res.send("incorrect password");
                        }
                    } else {
                        res.json({ error: "Thread not found" });
                    }
                }
            } catch (err) {
                res.status(500).send("Error deleting the reply");
            }
        });
};
