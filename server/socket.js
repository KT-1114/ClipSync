import { Server as SocketIOServer } from "socket.io";
import { networkInterfaces } from "os";
import ipaddr from "ipaddr.js";

const setupSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map();

  const disconnect = (socket) => {
    for (const [userIP, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userIP);
        console.log(`User IP address Disconnected: ${userIP}`);
        break;
      }
    }
  };

  const sendMessage = (message) => {
    try {
      for (const socketId of userSocketMap.values()) {
        io.to(socketId).emit("receive-message", message);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  function getLocalIPAndSubnet() {
    const interfaces = networkInterfaces();
    for (const interfaceName in interfaces) {
      for (const iface of interfaces[interfaceName]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return { ip: iface.address, subnet: iface.netmask };
        }
      }
    }
    return null;
  }

  function applySubnetMask(ip, subnet) {
    const ipBytes = ipaddr.parse(ip).toByteArray();
    const subnetBytes = ipaddr.parse(subnet).toByteArray();

    return ipBytes.map((byte, index) => byte & subnetBytes[index]);
  }

  function isSameNetwork(ip1, ip2, subnet) {
    try {
      const network1 = applySubnetMask(ip1, subnet);
      const network2 = applySubnetMask(ip2, subnet);

      return network1.every((byte, index) => byte === network2[index]);
    } catch (error) {
      console.error("Error checking same network:", error);
      return false;
    }
  }

  function checkSameWiFi(peerIP) {
    const myInfo = getLocalIPAndSubnet();
    console.log("myInfo:", myInfo);

    if (!myInfo) {
        console.warn("Could not determine local network information.");
        return false;
    }

    if (!peerIP || typeof peerIP !== "string") {
        console.error("Invalid peer IP received:", peerIP);
        return false;
    }

    peerIP = peerIP.trim();

    if (!ipaddr.isValid(peerIP)) {
        console.error("Peer IP is not a valid IP address:", peerIP);
        return false;
    }

    return isSameNetwork(myInfo.ip, peerIP, myInfo.subnet);
}

io.on("connection", (socket) => {
    const userIP = socket.handshake.query.userIP;

    if (!userIP) {
        console.warn("User IP address not provided during connection.");
        socket.disconnect(true); 
        return;
    }

    if (checkSameWiFi(userIP)) {
        userSocketMap.set(userIP, socket.id);
        console.log(`User IP address connected: ${userIP} with socket ID: ${socket.id}`);
    } else {
        console.warn(`User IP (${userIP}) is not on the same network.`);
        socket.disconnect(true); 
    }

    socket.on("sendMessage", (message) => sendMessage(message));
    socket.on("disconnect", () => disconnect(socket));
});

};

export default setupSocket;
