import { Stack } from "expo-router";
import { SocketProvider } from "../components/SocketProvider";

export default function RootLayout() {
  return (
    <SocketProvider>
      <Stack />
    </SocketProvider>
  );
}