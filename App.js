import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, Button, StyleSheet, Text, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';

export default function Component() {
  const [url, setUrl] = useState('https://staticwonders.vercel.app/');
  const [inputUrl, setInputUrl] = useState('https://staticwonders.vercel.app/');
  const [hasPermission, setHasPermission] = useState(null);
  const [receivedData, setReceivedData] = useState({});
  const [fps, setFps] = useState(0);
  const webViewRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const lastUpdateTimeRef = useRef(Date.now());

  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    const fpsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastUpdateTimeRef.current) / 1000;
      const currentFps = frameCountRef.current / elapsed;
      setFps(Math.round(currentFps));
      frameCountRef.current = 0;
      lastUpdateTimeRef.current = now;
    }, 1000);

    return () => clearInterval(fpsInterval);
  }, []);

  const onShouldStartLoadWithRequest = (event) => {
    return true;
  };

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setReceivedData(data);

      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 16) {
        frameCountRef.current += 1;
        lastFrameTimeRef.current = now;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }, []);

  const injectJavaScript = `
    (function() {
      function handleMessage(event) {
        window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
      }
      window.addEventListener('message', handleMessage);
      var originalPostMessage = window.postMessage;
      window.postMessage = function(message) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
        return originalPostMessage.apply(window, arguments);
      };
    })();
  `;

  const handleLoadUrl = () => {
    setUrl(inputUrl);
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>Camera permission is required.</Text></View>;
  }

  const renderData = (data, level = 0) => {
    if (typeof data !== 'object' || data === null) {
      return <Text key={Math.random()} style={[styles.dataText, { marginLeft: level * 10 }]}>{JSON.stringify(data)}</Text>;
    }

    return Object.entries(data).map(([key, value]) => (
      <View key={key}>
        <Text style={[styles.dataText, { marginLeft: level * 10, fontWeight: 'bold' }]}>{key}:</Text>
        {renderData(value, level + 1)}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setInputUrl}
          value={inputUrl}
          placeholder="Enter URL"
          keyboardType="url"
        />
        <Button title="Load" onPress={handleLoadUrl} />
      </View>
      <View style={[styles.webViewContainer, { width: windowWidth, height: windowHeight }]}>
        <WebView 
          ref={webViewRef}
          source={{ uri: url }} 
          style={styles.webview}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onMessage={onMessage}
          injectedJavaScript={injectJavaScript}
        />
        <View style={styles.fpsContainer}>
          <Text style={styles.fpsText}>FPS: {fps}</Text>
        </View>
        <ScrollView style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Received Data:</Text>
          {renderData(receivedData)}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    height: 60,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 10,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  fpsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 5,
  },
  fpsText: {
    color: 'white',
    fontSize: 14,
  },
  dataContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    padding: 10,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dataText: {
    fontSize: 12,
    marginBottom: 2,
  },
});