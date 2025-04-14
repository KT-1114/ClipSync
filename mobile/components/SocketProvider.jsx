import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import * as Network from 'expo-network';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

const SERVER_URL = 'https://clipsync-qhc1.onrender.com';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [ipInfo, setIpInfo] = useState({ ip: '' });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpInfo({ ip });

        console.log('Connecting to server:', SERVER_URL);

        const newSocket = io(SERVER_URL, {
          query: { userIP: ip },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 3000,
          timeout: 20000,
          secure: true,
        });

        newSocket.on('connect', () => {
          console.log('Connected to server:', newSocket.id);
          setConnectionStatus('connected');
        });

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error.message);
          setConnectionStatus('error');
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Disconnected:', reason);
          setConnectionStatus('disconnected');
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Socket initialization failed:', error);
        setConnectionStatus('error');
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, ipInfo, connectionStatus }}>
      {children}
    </SocketContext.Provider>
  );
};