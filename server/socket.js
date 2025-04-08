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

  // Map<subnetKey, Map<userIP, socketId>>
  const subnetSocketMap = new Map();

  function applySubnetMask(ip, subnet) {
    const ipBytes = ipaddr.parse(ip).toByteArray();
    const subnetBytes = ipaddr.parse(subnet).toByteArray();
    return ipBytes.map((byte, i) => byte & subnetBytes[i]).join(".");
  }

  function getSubnetKey(ip, subnet) {
    return applySubnetMask(ip, subnet);
  }

  function disconnect(socket) {
    for (const [subnet, userMap] of subnetSocketMap.entries()) {
      for (const [ip, sockId] of userMap.entries()) {
        if (sockId === socket.id) {
          userMap.delete(ip);
          console.log(`Disconnected: ${ip} from subnet ${subnet}`);
          if (userMap.size === 0) subnetSocketMap.delete(subnet);
          return;
        }
      }
    }
  }

  function sendMessage(message, senderIP, subnetKey) {
    const userMap = subnetSocketMap.get(subnetKey);
    if (!userMap) return;

    for (const [ip, sockId] of userMap.entries()) {
      if (ip !== senderIP) {
        // console.log(`Sending message from ${senderIP} to ${ip}: ${message}`);
        io.to(sockId).emit("receive-message", message);
      }
    }
  }

  io.on("connection", (socket) => {
    const userIP = socket.handshake.query.userIP;
    const subnet = socket.handshake.query.subnet;

    if (!userIP || !subnet || !ipaddr.isValid(userIP) || !ipaddr.isValid(subnet)) {
      console.warn("Invalid or missing userIP/subnet");
      return socket.disconnect(true);
    }

    const subnetKey = getSubnetKey(userIP, subnet);

    if (!subnetSocketMap.has(subnetKey)) {
      subnetSocketMap.set(subnetKey, new Map());
    }

    subnetSocketMap.get(subnetKey).set(userIP, socket.id);
    // console.log(`Connected: ${userIP} under subnet ${subnetKey}`);

    socket.on("sendMessage", (message) => {
      sendMessage(message, userIP, subnetKey);
    });

    socket.on("disconnect", () => {
      disconnect(socket);
    });
  });
};

export default setupSocket;
