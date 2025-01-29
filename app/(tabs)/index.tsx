import React from 'react';
import { SafeAreaView } from 'react-native';
import LandingPage from './landing';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LandingPage />
    </SafeAreaView>
  );
}
