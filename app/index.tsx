import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BREAKFAST_MENU_HTML } from '@/constants/breakfastMenu';

export default function BreakfastMenuScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        style={styles.webview}
        source={{ html: BREAKFAST_MENU_HTML, baseUrl: 'https://fonts.googleapis.com' }}
        originWhitelist={['*']}
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8DFD3',
  },
  webview: {
    flex: 1,
    backgroundColor: '#E8DFD3',
  },
});
