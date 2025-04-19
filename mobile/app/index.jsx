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
  const [showHistory, setShowHistory] = useState(false);
  const [clipboardType, setClipboardType] = useState("text");
  const [lastClipboardContent, setLastClipboardContent] = useState(null);

  const { socket } = useSocket();

  // Monitor clipboard for new content
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (await Clipboard.hasImageAsync()) {
          const image = await Clipboard.getImageAsync({ format: "png", quality: 0.8 });

          if (image?.data && image.data !== lastClipboardContent) {
            let imageData = image.data;
            if (!imageData.startsWith("data:image")) {
              imageData = `data:image/png;base64,${imageData}`;
            }

            setClipboardType("image");
            setCopiedItem(imageData);
            setCopiedHistory((prev) => [
              { type: "image", content: imageData, timestamp: Date.now() },
              ...prev,
            ]);
            setLastClipboardContent(imageData);

            if (socket) {
              socket.emit("sendMessage", {
                type: "image",
                content: imageData,
              });
            }
          }
        } else {
          const text = await Clipboard.getStringAsync();
          if (text && text !== lastClipboardContent) {
            setClipboardType("text");
            setCopiedItem(text);
            setCopiedHistory((prev) => [
              { type: "text", content: text, timestamp: Date.now() },
              ...prev,
            ]);
            setLastClipboardContent(text);

            if (socket) {
              socket.emit("sendMessage", { type: "text", content: text });
            }
          }
        }
      } catch (error) {
        console.error("Clipboard check error:", error);
      }
    };

    const intervalId = setInterval(checkClipboard, 2000);
    return () => clearInterval(intervalId);
  }, [lastClipboardContent, socket]);

  // Handle incoming messages
  useEffect(() => {
    if (socket) {
      socket.on("receive-message", async (data) => {
        console.log("Received from another device:", data);

        if (typeof data === "string") {
          handleTextMessage(data);
        } else if (data.type === "text") {
          if (data.content !== lastClipboardContent) {
            handleTextMessage(data.content);
          }
        } else if (data.type === "image") {
          if (data.content !== lastClipboardContent) {
            handleImageMessage(data.content);
          }
        }
      });

      return () => {
        socket.off("receive-message");
      };
    }
  }, [socket, lastClipboardContent]);

  const handleTextMessage = (text) => {
    setClipboardType("text");
    setCopiedItem(text);
    setCopiedHistory((prev) => [
      { type: "text", content: text, timestamp: Date.now() },
      ...prev,
    ]);
    setLastClipboardContent(text);
    Clipboard.setStringAsync(text);
  };

  const handleImageMessage = async (imageData) => {
    try {
      const base64Data = imageData.replace(/^data:image\/(png|jpeg);base64,/, "");

      setClipboardType("image");
      setCopiedItem(imageData);
      setCopiedHistory((prev) => [
        { type: "image", content: imageData, timestamp: Date.now() },
        ...prev,
      ]);
      setImageUrl(imageData);
      setLastClipboardContent(imageData);

      await Clipboard.setImageAsync({
        data: base64Data,
        format: "png",
      });
    } catch (error) {
      console.error("Error handling image message:", error);
    }
  };

  const copyToClipboard = async () => {
    if (!inputText.trim()) return;

    await Clipboard.setStringAsync(inputText);
    if (socket) {
      socket.emit("sendMessage", {
        type: "text",
        content: inputText,
      });
    }
    handleTextMessage(inputText);
    setInputText("");
  };

  const resetContent = async () => {
    setCopiedItem(null);
    setImageUrl(null);
    setInputText("");
    setShowHistory(false);
    setLastClipboardContent(null);
    setCopiedHistory([]);
    try {
      await Clipboard.setStringAsync(""); // Clears text clipboard
    } catch (err) {
      console.error("Clipboard clear error:", err);
    }
  };

  const renderHistoryItem = (item, index) => {
    if (item.type === "image") {
      return (
        <View key={index} style={styles.historyImageContainer}>
          <Image
            source={{ uri: item.content }}
            style={styles.historyImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    return (
      <View key={index} style={styles.historyTextContainer}>
        <Text style={styles.historyItem} selectable>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <TextInput
          style={styles.textInput}
          onChangeText={setInputText}
          value={inputText}
          placeholder="Type something to copy"
          multiline
        />
        <View style={styles.buttonContainer}>
          <Button
            title="Copy to Clipboard"
            onPress={copyToClipboard}
            disabled={!inputText.trim()}
          />
          <Button
            title={showHistory ? "Close History" : "View History"}
            onPress={() => setShowHistory((prev) => !prev)}
            color={showHistory ? "orange" : "blue"}
          />
          <Button title="Reset" onPress={resetContent} color="red" />
        </View>

        {showHistory && copiedHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyHeader}>Copy History:</Text>
            {copiedHistory.map((item, index) => renderHistoryItem(item, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  scrollView: {
    flexGrow: 1,
    alignItems: "center",
  },
  textInput: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 60,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  historyContainer: {
    width: "100%",
    marginTop: 20,
  },
  historyHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  historyTextContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  historyItem: {
    color: "#333",
    fontSize: 14,
  },
  historyImageContainer: {
    width: "100%",
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
  },
  historyImage: {
    width: "100%",
    height: 150,
  },
});
