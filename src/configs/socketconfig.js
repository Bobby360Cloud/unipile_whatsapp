import http from "http";
import { Server } from "socket.io";
import { handleQRGeneration } from "../helpers/apiHelper";

const userSocketMap = {};

let io;

export const initializeSocket = (app) => {
  const server = http.createServer(app);
  io = new Server(server, {
    cors: {
      origin: [process.env.APP_HOST, "https://*.force.com", "https://*.salesforce.com"],
      methods: ["GET", "POST"],
    },
  });

  console.log(process.env.APP_HOST, "--------------->socket_app_host");

  io.on("connection", (socket) => {
    socket.on("room", function (room) {
      const socketId = socket.id;
      userSocketMap[room] = socketId;
      console.log("ROOM JOIN=====>", socketId, room, process.env.APP_HOST, userSocketMap);
      socket.join(room);
      socket.emit("joined", room);
    });

    socket.on("qr", (data) => {
      console.log("QR DATA RECEIVED IN SOCKET:", data);
      handleQRGeneration(data.sessionId);
      //io.to(userSocketMap[data.sessionId]).emit("qr", { phone: data.phone, sessionId: data.sessionId });
    });

    socket.on("remove", (room) => {
      console.log(room);
      console.log("user disconnected", socket.id);
      delete userSocketMap[room];
    });

    socket.on("disconnect", () => {
      const sock = Object.entries(userSocketMap).find(([key, value]) => value === socket.id);
      if (sock?.length) {
        delete userSocketMap[sock[0]];
      }
    });
  });

  return server;
};

export const emitStatus = (roomOrSocketId, statusData) => {
  console.log("Emitting status to roomOrSocketId:", roomOrSocketId, "with data:", statusData?.status);
  if (io) {
    let actualSocketId = userSocketMap[roomOrSocketId];
    if (!actualSocketId) {
      actualSocketId = roomOrSocketId;
    }
    
    const socket = io.sockets.sockets.get(actualSocketId);
    if (socket) {
      socket.emit("status", statusData);
    } else {
      console.warn("Socket not found for ID:", actualSocketId);
    }
  }
};

export const getReceiverSocketId = (value) => {
  return userSocketMap[value];
};
