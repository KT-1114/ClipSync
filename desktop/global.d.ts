interface Window {
    electronClipboard: {
      readText: () => string;           // Method to read text from clipboard
      writeText: (text: string) => void; // Method to write text to clipboard
      writeImage: (imagePath: string) => void; // Method to write an image to clipboard
      readImage: () => Electron.NativeImage; // Method to read an image from clipboard
    };
  }
  