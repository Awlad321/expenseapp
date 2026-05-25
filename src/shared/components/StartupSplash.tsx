import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radius, spacing } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

export function StartupSplash() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(14)).current;
  const emblemScale = useRef(new Animated.Value(0.92)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const chipOne = useRef(new Animated.Value(0)).current;
  const chipTwo = useRef(new Animated.Value(0)).current;
  const chipThree = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(emblemScale, {
        toValue: 1,
        damping: 12,
        stiffness: 130,
        mass: 0.88,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.stagger(240, [
          floatChip(chipOne),
          floatChip(chipTwo),
          floatChip(chipThree),
        ])
      ),
    ]).start();
  }, [chipOne, chipThree, chipTwo, emblemScale, lift, opacity, pulse]);

  const backdropScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const backdropOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.08],
  });

  const gradientColors = useMemo<[string, string, string]>(() => (
    theme.scheme === 'dark'
      ? ['#081114', '#102126', '#0B171A']
      : ['#F7FBF9', '#EDF7F3', '#E4F4EE']
  ), [theme.scheme]);

  const ringColor = theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(7,17,19,0.06)';
  const chipBackground = theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const bannerBackground = theme.scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(7,17,19,0.05)';
  const minSide = Math.min(width, height);
  const sceneSize = Math.max(160, Math.min(minSide * 0.48, 210));
  const emblemWrapSize = Math.round(sceneSize * 0.76);
  const outerRingSize = Math.round(sceneSize * 0.63);
  const emblemSize = Math.round(sceneSize * 0.47);
  const iconSize = Math.round(emblemSize * 0.45);
  const glowSize = Math.max(220, Math.min(minSide * 0.72, 320));
  const copyWidth = Math.min(width - spacing.xl * 2, 320);
  const moneyBaseBottom = Math.round(sceneSize * 0.34);
  const moneySideOffset = Math.round(sceneSize * 0.19);
  const moneyTopBottom = Math.round(sceneSize * 0.39);
  const chipXOffset = Math.round(sceneSize * 0.24);
  const chipYOffsetSide = Math.round(sceneSize * 0.39);
  const chipYOffsetTop = Math.round(sceneSize * 0.56);
  const compactScreen = height < 700;

  return (
    <LinearGradient colors={gradientColors} style={styles.screen}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: theme.colors.primary,
            opacity: backdropOpacity,
            transform: [{ scale: backdropScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            gap: compactScreen ? spacing.lg : spacing.xl,
            opacity,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <View style={[styles.scene, { width: sceneSize, height: sceneSize }]}>
          <Animated.View
            style={[
              styles.emblemWrap,
              {
                width: emblemWrapSize,
                height: emblemWrapSize,
                borderRadius: emblemWrapSize / 2,
                borderColor: ringColor,
                backgroundColor: theme.colors.cardGlass,
                transform: [{ scale: emblemScale }],
              },
            ]}
          >
            <View style={[styles.outerRing, { width: outerRingSize, height: outerRingSize, borderRadius: outerRingSize / 2, borderColor: ringColor }]}>
              <LinearGradient
                colors={
                  theme.scheme === 'dark'
                    ? ['#2AD58F', '#149E6E']
                    : ['#1ACB88', '#149E6E']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.emblem, { width: emblemSize, height: emblemSize, borderRadius: emblemSize / 2 }]}
              >
                <Ionicons name="wallet-outline" size={iconSize} color="#F7FFFB" />
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.View style={[styles.moneyChip, { bottom: moneyBaseBottom, left: moneySideOffset }, chipStyle(chipOne, -chipXOffset, -chipYOffsetSide, -14)]}>
            <View style={[styles.moneyPill, { backgroundColor: chipBackground, borderColor: ringColor }]}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.warning} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.moneyChip, { bottom: moneyTopBottom }, chipStyle(chipTwo, 0, -chipYOffsetTop, 0)]}>
            <View style={[styles.moneyPill, { backgroundColor: chipBackground, borderColor: ringColor }]}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.income} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.moneyChip, { bottom: moneyBaseBottom, right: moneySideOffset }, chipStyle(chipThree, chipXOffset, -chipYOffsetSide, 16)]}>
            <View style={[styles.moneyPill, { backgroundColor: chipBackground, borderColor: ringColor }]}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.accent} />
            </View>
          </Animated.View>
        </View>

        <View style={[styles.copy, { width: copyWidth }]}>
          <AppText variant="title">ExpensApp</AppText>
          <AppText muted style={styles.subtitle}>Cash in. Cash out. Stay clear.</AppText>
          <View style={[styles.banner, { backgroundColor: bannerBackground, borderColor: ringColor }]}>
            <AppText muted style={styles.bannerText}>awlad getting poor each time he opens the app</AppText>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function floatChip(value: Animated.Value) {
  return Animated.sequence([
    Animated.timing(value, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    }),
  ]);
}

function chipStyle(value: Animated.Value, xOffset: number, yOffset: number, rotateDeg: number) {
  return {
    opacity: value.interpolate({
      inputRange: [0, 0.1, 0.84, 1],
      outputRange: [0, 1, 0.82, 0],
    }),
    transform: [
      {
        translateX: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, xOffset],
        }),
      },
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, yOffset],
        }),
      },
      {
        rotate: value.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${rotateDeg}deg`],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0.72, 1, 0.92],
        }),
      },
    ],
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glow: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
  },
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  outerRing: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moneyChip: {
    position: 'absolute',
  },
  moneyPill: {
    minWidth: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
  banner: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: {
    textAlign: 'center',
  },
});
