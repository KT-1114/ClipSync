import { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSocket } from "../components/SocketProvider";

export default function Index() {
  const [copiedItem, setCopiedItem] = useState(null);
  const [copiedHistory, setCopiedHistory] = useState([]);
  const [inputText, setInputText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [lastClipboardContent, setLastClipboardContent] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const { socket } = useSocket();

  useEffect(() => {
    const intervalId = setInterval(async () => {
      const currentClipboardContent = await Clipboard.getStringAsync();
      if (
        currentClipboardContent &&
        currentClipboardContent !== lastClipboardContent
      ) {
        console.log(
          "New clipboard content detected via polling:",
          currentClipboardContent
        );
        setCopiedItem(currentClipboardContent);
        setCopiedHistory((prev) => [currentClipboardContent, ...prev]);
        setLastClipboardContent(currentClipboardContent);
        setImageUrl(null);

        if (socket) socket.emit("sendMessage", currentClipboardContent);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [lastClipboardContent, socket]);

  useEffect(() => {
    if (socket) {
      socket.on("receive-message", (data) => {
        console.log("Received from another device:", data);
        setCopiedItem(data);
        setCopiedHistory((prev) => [data, ...prev]);
        setLastClipboardContent(data);
        setImageUrl(null);
        Clipboard.setStringAsync(data);
      });
    }
  }, [socket]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(inputText);
  };

  const fetchCopiedContent = async () => {
    setShowHistory(true);
    if (await Clipboard.hasImageAsync()) {
      const image = await Clipboard.getImageAsync({ format: "jpeg" });
      setImageUrl(image.data);
    }
  };

  const resetContent = () => {
    setCopiedItem(null);
    setImageUrl(null);
    setInputText("");
    setShowHistory(false);
  };

  const closeHistory = () => {
    setShowHistory(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <TextInput
          style={styles.textInput}
          onChangeText={setInputText}
          value={inputText}
          placeholder="Type something here"
        />
        <Button
          title="Click here to copy to Clipboard"
          onPress={copyToClipboard}
        />
        <Button
          title={showHistory ? "Close History" : "View copied content"}
          onPress={() => setShowHistory((prev) => !prev)}
          color={showHistory ? "orange" : undefined}
        />

        <Button title="Reset" onPress={resetContent} color="red" />

        {copiedItem && (
          <Text selectable style={styles.copiedText}>
            {copiedItem}
          </Text>
        )}

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        )}

        {showHistory && copiedHistory.length > 0 && (
          <>
            <Text style={styles.historyHeader}>Copied History:</Text>
            {copiedHistory.map((item, index) => (
              <Text key={index} style={styles.historyItem} selectable>
                {item}
              </Text>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  textInput: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    width: "80%",
    marginBottom: 20,
    paddingLeft: 8,
  },
  copiedText: {
    marginTop: 10,
    color: "red",
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: 200,
    marginTop: 20,
  },
  historyHeader: {
    marginTop: 30,
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  historyItem: {
    color: "#555",
    fontSize: 14,
    marginTop: 5,
  },
});
