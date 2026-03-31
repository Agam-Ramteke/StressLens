import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
      <DashboardScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
});
