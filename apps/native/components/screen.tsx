import { type PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenProps = PropsWithChildren<{
  contentContainerStyle?: ViewStyle;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
}>;

export function Screen({ children, contentContainerStyle, scrollViewProps }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: Math.max(insets.bottom, 24),
          paddingTop: Math.max(insets.top, 24)
        },
        contentContainerStyle
      ]}
      keyboardShouldPersistTaps="handled"
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 20
  },
  empty: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center"
  },
  emptyDescription: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  emptyTitle: {
    color: "#101828",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  root: {
    backgroundColor: "#f8fafc",
    flex: 1
  }
});
