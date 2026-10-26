import { Bookmark, Info, Menu, UserRound, X } from 'lucide-react-native';
import { type ReactNode, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Platform,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from './BrandLogo';
import type { ViewName } from '../navigation/types';
import { COLORS, styles } from '../styles';

export function TopBar({
  activeView,
  savedCount,
  onHome,
  onSaved,
  onAccount,
  onInfo,
}: {
  activeView: ViewName;
  savedCount: number;
  onHome: () => void;
  onSaved: () => void;
  onAccount: () => void;
  onInfo: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingDestination = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  const drawerWidth = Math.min(useWindowDimensions().width * 0.86, 360);

  function closeMenu() {
    setMenuOpen(false);
  }

  function chooseDestination(destination: () => void) {
    if (Platform.OS === 'ios') {
      pendingDestination.current = destination;
      closeMenu();
      return;
    }
    closeMenu();
    destination();
  }

  function finishMenuDismissal() {
    const destination = pendingDestination.current;
    pendingDestination.current = null;
    destination?.();
  }

  return (
    <>
      <View style={styles.topBar}>
        <Pressable
          onPress={onHome}
          style={({ pressed }) => [
            styles.wordmarkWrap,
            pressed && styles.pressed,
          ]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
        >
          <BrandLogo />
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [
            styles.menuTrigger,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          accessibilityState={{ expanded: menuOpen }}
        >
          <Menu size={23} color={COLORS.ink} strokeWidth={2.3} />
        </Pressable>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        onDismiss={finishMenuDismissal}
        statusBarTranslucent
      >
        <View style={styles.menuOverlay} accessibilityViewIsModal>
          <Pressable
            style={styles.menuScrim}
            onPress={closeMenu}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          />
          <View
            style={[
              styles.menuDrawer,
              {
                width: drawerWidth,
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuEyebrow}>INSTEAD</Text>
                <Text style={styles.menuTitle}>Your spaces</Text>
              </View>
              <Pressable
                onPress={closeMenu}
                style={({ pressed }) => [
                  styles.menuCloseButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <X size={21} color={COLORS.ink} />
              </Pressable>
            </View>

            <View style={styles.menuItems}>
              <MenuItem
                label="My INSTEAD"
                detail="Profile and your recipes"
                active={activeView === 'account'}
                onPress={() => chooseDestination(onAccount)}
                icon={<UserRound size={21} color={COLORS.ink} />}
              />
              <MenuItem
                label="Saved guides"
                detail="Your bookmarked alternatives"
                active={activeView === 'saved'}
                onPress={() => chooseDestination(onSaved)}
                icon={<Bookmark size={21} color={COLORS.ink} />}
                count={savedCount}
              />
              <MenuItem
                label="Info & safety"
                detail="How INSTEAD works"
                active={activeView === 'info'}
                onPress={() => chooseDestination(onInfo)}
                icon={<Info size={21} color={COLORS.ink} />}
              />
            </View>

            <View style={styles.menuFooter}>
              <View style={styles.menuFooterRule} />
              <Text style={styles.menuFooterText}>
                Simple ingredients. Everyday alternatives.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  label,
  detail,
  active,
  onPress,
  icon,
  count,
}: {
  label: string;
  detail: string;
  active: boolean;
  onPress: () => void;
  icon: ReactNode;
  count?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        active && styles.menuItemActive,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}${count ? `, ${count} saved` : ''}`}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
        {icon}
      </View>
      <View style={styles.menuItemCopy}>
        <Text style={styles.menuItemLabel}>{label}</Text>
        <Text style={styles.menuItemDetail}>{detail}</Text>
      </View>
      {count ? (
        <View style={styles.menuCountBadge}>
          <Text style={styles.menuCountText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
