import { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Image, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export default function Index() {
    const [copiedItem, setCopiedItem] = useState<string | null>(null);  // Text copied
    const [inputText, setInputText] = useState<string>('');  // State for text input
    const [imageUrl, setImageUrl] = useState<string | null>(null);  // Image URL
    const [lastClipboardContent, setLastClipboardContent] = useState<string | null>(null); // Store last clipboard content
    useEffect(() => {
        const clipboardListener = Clipboard.addClipboardListener(({ contentTypes }: Clipboard.ClipboardEvent) => {
            if (contentTypes.includes(Clipboard.ContentType.PLAIN_TEXT)) {
                Clipboard.getStringAsync().then(content => {
                    if (content !== lastClipboardContent) {
                        console.log('New plain text copied:', content); // Log the new content
                        setCopiedItem(content);
                        setLastClipboardContent(content);
                        setImageUrl(null);  // Clear any previously set image
                    }
                });
            } else if (contentTypes.includes(Clipboard.ContentType.IMAGE)) {
                setImageUrl(null);  // Clear any previously set text
                fetchCopiedContent();
            }
        });
        // Polling mechanism to check clipboard content
        const intervalId = setInterval(async () => {
            const currentClipboardContent = await Clipboard.getStringAsync();
            if (currentClipboardContent !== lastClipboardContent) {
                console.log('New clipboard content detected via polling:', currentClipboardContent); // Log the new content
                setCopiedItem(currentClipboardContent);
                setLastClipboardContent(currentClipboardContent);
                setImageUrl(null);  // Clear any previously set image
            }
        }, 2000); // Check every 2 seconds
        // Clean up listener and interval when the component is unmounted
        return () => {
            clipboardListener.remove();
            clearInterval(intervalId);
        };
    }, [lastClipboardContent]);
    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(inputText); // Copy whatever is in the text input
    };
    const fetchCopiedContent = async () => {
        if (await Clipboard.hasImageAsync()) {
            const image = await Clipboard.getImageAsync({ format: 'jpeg' });
            setImageUrl(image.data);  // Set the image URL to state
        }
    };
    const resetContent = () => {
        setCopiedItem(null);  // Reset text content
        setImageUrl(null);  // Reset image content
        setInputText('');  // Reset input text
    };
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollView}>
                <TextInput
                    style={styles.textInput}
                    onChangeText={setInputText} // Update state when the text changes
                    value={inputText} // Bind the input field to the state
                    placeholder="Type something here"
                />
                <Button title="Click here to copy to Clipboard" onPress={copyToClipboard} />
                <Button title="View copied content" onPress={fetchCopiedContent} />
                <Button title="Reset" onPress={resetContent} color="red" />
                {/* Display copied text if available */}
                {copiedItem && (
                    <Text selectable style={styles.copiedText}>
                        {copiedItem}
                    </Text>
                )}
                {/* Display the image if available */}
                {imageUrl && (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        resizeMode="contain" // Ensures the image is scaled to fit within the container without distortion
                    />
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20, // Optional: add padding to the bottom of the scrollview for better UI
    },
    textInput: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        width: '80%',  // Adjust width of text input
        marginBottom: 20,
        paddingLeft: 8,
    },
    copiedText: {
        marginTop: 10,
        color: 'red',
        textAlign: 'center',  // Ensure text is centered
    },
    image: {
        width: '100%',  // Makes the image take up full width of its container
        height: 200, // Height remains fixed
        marginTop: 20,
    },
});