import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Drawer } from 'expo-router/drawer';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { usePathname, useRouter } from 'expo-router';
import { PhotoBackdrop, themeForPath } from '@/components/PhotoBackdrop';
import { ArrowLeft } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { SECTIONS } from '@/constants/sections';
import { useAuth } from '@/lib/AuthContext';
import { GLASS } from '@/components/ui';

const WIDE_BREAKPOINT = 900;

function SidebarContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const activeRoute = props.state.routes[props.state.index]?.name;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContent}
    >
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>🐠 AquaCare</Text>
        {user?.email ? <Text style={styles.brandSub}>{user.email}</Text> : null}
      </View>
      {SECTIONS.map((section, index) => {
        const active =
          activeRoute === section.name ||
          (section.name === 'index' && activeRoute === 'tank/[id]');
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
            <Text style={[styles.itemNumber, active && styles.itemTextActive]}>
              {index + 1}
            </Text>
            <Icon
              color={active ? colors.primary : colors.textMuted}
              size={18}
            />
            <Text style={[styles.itemLabel, active && styles.itemTextActive]}>
              {section.label}
            </Text>
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
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <PhotoBackdrop theme={themeForPath(pathname)} />
      <Drawer
        drawerContent={(props) => <SidebarContent {...props} />}
        screenOptions={{
          drawerType: wide ? 'permanent' : 'front',
          drawerStyle: {
            backgroundColor: wide ? 'rgba(4,16,26,0.62)' : 'rgba(6,22,34,0.97)',
            width: 270,
            borderRightColor: colors.border,
            ...GLASS,
          },
          headerStyle: {
            backgroundColor: 'rgba(4,16,26,0.55)',
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          sceneStyle: { backgroundColor: 'transparent' },
          overlayColor: 'rgba(0,0,0,0.55)',
          // The sidebar is always visible on wide screens, so the menu button would do nothing.
          ...(wide ? { headerLeft: () => null } : {}),
        }}
      >
        {SECTIONS.map((section) => (
          <Drawer.Screen
            key={section.name}
            name={section.name}
            options={{ title: section.label }}
          />
        ))}
        <Drawer.Screen
          name="tank/[id]"
          options={{
            title: 'Akvárium',
            headerLeft: () => <BackToTanks />,
            swipeEnabled: false,
          }}
        />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  drawerContent: { paddingHorizontal: spacing.sm, paddingBottom: spacing.lg },
  brand: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
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
  itemNumber: {
    color: colors.textMuted,
    width: 18,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  itemLabel: { color: colors.text, fontSize: 15 },
  itemTextActive: { color: colors.primary, fontWeight: '700' },
  backButton: { paddingHorizontal: spacing.md },
});
