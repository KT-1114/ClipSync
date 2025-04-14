import { Server as SocketIOServer } from "socket.io";
import ipaddr from "ipaddr.js";

const setupSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Map<groupKey, Map<userIP, socketId>>
  const groupSocketMap = new Map();

  // Extract first 3 octets of IP, e.g., 192.168.1 from 192.168.1.23
  function getGroupKey(ip) {
    if (!ipaddr.isValid(ip)) return null;
    const ipParts = ip.split(".");
    if (ipParts.length !== 4) return null;
    return ipParts.slice(0, 3).join("."); // Group by local network prefix
  }

  function disconnect(socket) {
    for (const [group, userMap] of groupSocketMap.entries()) {
      for (const [ip, sockId] of userMap.entries()) {
        if (sockId === socket.id) {
          userMap.delete(ip);
          console.log(`Disconnected: ${ip} from group ${group}`);
          if (userMap.size === 0) groupSocketMap.delete(group);
          return;
        }
      }
    }
  }

  function sendMessage(message, senderIP, groupKey) {
    const userMap = groupSocketMap.get(groupKey);
    if (!userMap) return;

    for (const [ip, sockId] of userMap.entries()) {
      if (ip !== senderIP) {
        io.to(sockId).emit("receive-message", message);
      }
    }
  }

  io.on("connection", (socket) => {
    const userIP = socket.handshake.query.userIP;

    if (!userIP || !ipaddr.isValid(userIP)) {
      console.warn("Invalid or missing userIP");
      return socket.disconnect(true);
    }

    const groupKey = getGroupKey(userIP);
    if (!groupKey) {
      console.warn("Failed to generate groupKey for IP:", userIP);
      return socket.disconnect(true);
    }

    if (!groupSocketMap.has(groupKey)) {
      groupSocketMap.set(groupKey, new Map());
    }

    groupSocketMap.get(groupKey).set(userIP, socket.id);
    console.log(`Connected: ${userIP} in group ${groupKey}`);

    socket.on("sendMessage", (message) => {
      sendMessage(message, userIP, groupKey);
    });

    socket.on("disconnect", () => {
      disconnect(socket);
    });
  });
};

export default setupSocket;
