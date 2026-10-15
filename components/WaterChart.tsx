import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/constants/theme';
import { assessValue, formatValue, STATUS_LABELS, type ParamSpec, type WaterStatus } from '@/lib/water';

export const STATUS_COLORS: Record<WaterStatus, string> = {
  ok: colors.ok,
  watch: colors.warning,
  danger: colors.danger,
};

const PAD = { top: 12, right: 14, bottom: 24, left: 40 };

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function niceDomain(values: number[], spec: ParamSpec): [number, number] {
  const candidates = [...values];
  if (spec.ok[0] !== null) candidates.push(spec.ok[0]);
  if (spec.ok[1] !== null) candidates.push(spec.ok[1]);
  let min = Math.min(...candidates);
  let max = Math.max(...candidates);
  // Lower-bounded-only params (NH3, NO2, NO3, Cl2) always start at zero.
  if (spec.ok[0] === null) min = 0;
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.12;
  return [spec.ok[0] === null ? 0 : min - pad, max + pad];
}

/** Line chart of one water parameter with its ideal range shaded; tap a point to read it. */
export function WaterChart({ spec, points, height = 180 }: { spec: ParamSpec; points: { at: string; value: number }[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) {
    return <Text style={styles.empty}>Zatiaľ žiadne merania {spec.label}.</Text>;
  }

  const [yMin, yMax] = niceDomain(
    points.map((p) => p.value),
    spec
  );
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = height - PAD.top - PAD.bottom;
  const times = points.map((p) => new Date(p.at).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const x = (t: number) => PAD.left + (tMax === tMin ? plotW / 2 : ((t - tMin) / (tMax - tMin)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const bandTop = y(Math.min(spec.ok[1] ?? yMax, yMax));
  const bandBottom = y(Math.max(spec.ok[0] ?? yMin, yMin));
  const active = selected !== null && selected < points.length ? selected : points.length - 1;
  const activePoint = points[active];
  const activeStatus = assessValue(spec.key, activePoint.value);
  const tick = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

  return (
    <View>
      <View style={styles.readout} testID={`chart-readout-${spec.key}`}>
        <Text style={styles.readoutValue}>{formatValue(spec.key, activePoint.value)}</Text>
        <View style={[styles.dot, { backgroundColor: STATUS_COLORS[activeStatus] }]} />
        <Text style={styles.readoutMeta}>
          {STATUS_LABELS[activeStatus]} · {shortDate(activePoint.at)}
        </Text>
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height} accessibilityLabel={`Graf ${spec.label}`}>
            <Rect x={PAD.left} y={bandTop} width={plotW} height={Math.max(bandBottom - bandTop, 0)} fill={colors.ok} opacity={0.12} />
            {[yMin, (yMin + yMax) / 2, yMax].map((v) => (
              <SvgText key={v} x={PAD.left - 6} y={y(v) + 4} fill={colors.textMuted} fontSize={10} textAnchor="end">
                {tick(v)}
              </SvgText>
            ))}
            <Line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={colors.border} strokeWidth={1} />
            <SvgText x={PAD.left} y={height - 6} fill={colors.textMuted} fontSize={10}>
              {shortDate(points[0].at)}
            </SvgText>
            {points.length > 1 && (
              <SvgText x={PAD.left + plotW} y={height - 6} fill={colors.textMuted} fontSize={10} textAnchor="end">
                {shortDate(points[points.length - 1].at)}
              </SvgText>
            )}
            {points.length > 1 && (
              <Polyline
                points={points.map((p, i) => `${x(times[i])},${y(p.value)}`).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}
            {points.map((p, i) => (
              <Circle
                key={p.at + i}
                cx={x(times[i])}
                cy={y(p.value)}
                r={i === active ? 6 : 4.5}
                fill={STATUS_COLORS[assessValue(spec.key, p.value)]}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
          </Svg>
        )}
        {/* Invisible hit targets bigger than the dots. */}
        {width > 0 &&
          points.map((p, i) => (
            <Pressable
              key={`hit-${p.at}-${i}`}
              onPress={() => setSelected(i)}
              onHoverIn={() => setSelected(i)}
              accessibilityLabel={`${shortDate(p.at)}: ${formatValue(spec.key, p.value)}`}
              style={[styles.hit, { left: x(times[i]) - 16, top: y(p.value) - 16 }]}
            />
          ))}
      </View>
      <Text style={styles.legend}>Zelený pás = ideálny rozsah. {spec.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.md },
  readout: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  readoutValue: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  readoutMeta: { color: colors.textMuted, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hit: { position: 'absolute', width: 32, height: 32 },
  legend: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
