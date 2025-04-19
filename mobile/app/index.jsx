import { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSocket } from "../components/SocketProvider";

export default function Index() {
  const [copiedItem, setCopiedItem] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [copiedHistory, setCopiedHistory] = useState([]);
  const [inputText, setInputText] = useState("");
  const [lastClipboardContent, setLastClipboardContent] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const { socket } = useSocket();

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        setIsImage(await Clipboard.hasImageAsync());
        if (isImage) {
          console.log("Image detected in clipboard");
          let uri = await Clipboard.getImageAsync({ format: "jpeg"});
          if(!uri){
            uri = await Clipboard.getImageAsync({ format: "png"});
          }
          setCopiedItem("Image copied");
          setImageUri(uri);
          setCopiedHistory((prev) => [uri, ...prev]);
          setLastClipboardContent(uri);
          if (socket) socket.emit("sendMessage", uri);
          return;
        }
        else {
          const text = await Clipboard.getStringAsync();
          if (text && text !== lastClipboardContent) {
            setCopiedItem(text);
            setImageUri(null);
            setCopiedHistory((prev) => [text, ...prev]);
            setLastClipboardContent(text);
            if (socket) socket.emit("sendMessage", text);
          }
        }

      } catch (error) {
        console.error("Clipboard error:", error);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [lastClipboardContent, socket]);

  useEffect(() => {
    if (socket) {
      socket.on("receive-message", (data) => {
        const isImage = data.startsWith("data:image");
        setCopiedItem(isImage ? "Image copied" : data);
        setImageUri(isImage ? data : null);
        setCopiedHistory((prev) => [data, ...prev]);
        setLastClipboardContent(data);
        Clipboard.setStringAsync(data);
      });
    }
  }, [socket]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(inputText);
  };

  const resetContent = () => {
    setCopiedItem(null);
    setImageUri(null);
    setInputText("");
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

        {copiedItem && !imageUri && (
          <Text selectable style={styles.copiedText}>
            {copiedItem}
          </Text>
        )}

        {isImage && (
          <>
            <Text style={styles.copiedText}>Image copied</Text>
            <Image
              source={{ uri: imageUri?.data }}
              style={styles.image}
              resizeMode="contain"
            />
          </>
        )}

        {showHistory && copiedHistory.length > 0 && (
          <>
            <Text style={styles.historyHeader}>Copied History:</Text>
            {copiedHistory.map((item, index) => {
              const isImg = item.startsWith("data:image");
              return isImg ? (
                <Image
                  key={index}
                  source={{ uri: item }}
                  style={styles.historyImage}
                  resizeMode="cover"
                />
              ) : (
                <Text key={index} style={styles.historyItem} selectable>
                  {item}
                </Text>
              );
            })}
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
    width: 250,
    height: 250,
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
  historyImage: {
    width: 200,
    height: 200,
    marginTop: 10,
    borderRadius: 10,
  },
});
