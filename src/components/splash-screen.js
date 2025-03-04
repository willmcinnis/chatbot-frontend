// src/components/SplashScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

const SplashScreen = ({ onComplete }) => {
  const [isVideoComplete, setIsVideoComplete] = useState(false);

  useEffect(() => {
    // When component mounts, create a video element
    const videoElement = document.createElement('video');
    videoElement.src = '/splash-video.mp4'; // Place your video in the public folder
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    videoElement.style.position = 'absolute';
    videoElement.style.top = 0;
    videoElement.style.left = 0;
    
    // Listen for the end of the video
    videoElement.addEventListener('ended', () => {
      setIsVideoComplete(true);
      if (onComplete) onComplete();
    });
    
    // Fallback in case video doesn't load or play
    const timeoutId = setTimeout(() => {
      if (!isVideoComplete) {
        setIsVideoComplete(true);
        if (onComplete) onComplete();
      }
    }, 5000); // 5 second fallback timeout
    
    // Add video to container
    const container = document.getElementById('splash-container');
    if (container) {
      container.appendChild(videoElement);
    }
    
    // Cleanup function
    return () => {
      if (container && container.contains(videoElement)) {
        container.removeChild(videoElement);
      }
      clearTimeout(timeoutId);
    };
  }, [onComplete]);
  
  return (
    <View style={styles.container} id="splash-container" />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  }
});

export default SplashScreen;