import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { SECTIONS } from '@/constants/sections';
import { useAuth } from '@/lib/AuthContext';

const WIDE_BREAKPOINT = 900;

function SidebarContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const activeRoute = props.state.routes[props.state.index]?.name;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>🐠 AquaCare</Text>
        {user?.email ? <Text style={styles.brandSub}>{user.email}</Text> : null}
      </View>
      {SECTIONS.map((section, index) => {
        const active = activeRoute === section.name || (section.name === 'index' && activeRoute === 'tank/[id]');
        const Icon = section.icon;
        return (
          <Pressable
            key={section.name}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => props.navigation.navigate(section.name)}
            testID={`nav-${section.name}`}
            accessibilityRole="link"
            accessibilityLabel={section.label}
          >
            <Text style={[styles.itemNumber, active && styles.itemTextActive]}>{index + 1}</Text>
            <Icon color={active ? colors.primary : colors.textMuted} size={18} />
            <Text style={[styles.itemLabel, active && styles.itemTextActive]}>{section.label}</Text>
          </Pressable>
        );
      })}
    </DrawerContentScrollView>
  );
}

function BackToTanks() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={styles.backButton}
      accessibilityLabel="Späť na akváriá"
      testID="back-to-tanks"
    >
      <ArrowLeft color={colors.text} size={22} />
    </Pressable>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  return (
    <Drawer
      drawerContent={(props) => <SidebarContent {...props} />}
      screenOptions={{
        drawerType: wide ? 'permanent' : 'front',
        drawerStyle: { backgroundColor: colors.surface, width: 270, borderRightColor: colors.border },
        headerStyle: { backgroundColor: colors.background, borderBottomColor: colors.border },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
        overlayColor: 'rgba(0,0,0,0.55)',
        // The sidebar is always visible on wide screens, so the menu button would do nothing.
        ...(wide ? { headerLeft: () => null } : {}),
      }}
    >
      {SECTIONS.map((section) => (
        <Drawer.Screen key={section.name} name={section.name} options={{ title: section.label }} />
      ))}
      <Drawer.Screen
        name="tank/[id]"
        options={{ title: 'Akvárium', headerLeft: () => <BackToTanks />, swipeEnabled: false }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContent: { paddingHorizontal: spacing.sm, paddingBottom: spacing.lg },
  brand: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md, marginBottom: spacing.sm },
  brandTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  brandSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: colors.surfaceAlt },
  itemNumber: { color: colors.textMuted, width: 18, fontSize: 12, fontVariant: ['tabular-nums'] },
  itemLabel: { color: colors.text, fontSize: 15 },
  itemTextActive: { color: colors.primary, fontWeight: '700' },
  backButton: { paddingHorizontal: spacing.md },
});
