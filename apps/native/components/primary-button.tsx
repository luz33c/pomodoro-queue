import { type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

type PrimaryButtonProps = PropsWithChildren<
  PressableProps & {
    variant?: "primary" | "secondary" | "danger";
  }
>;

export function PrimaryButton({
  children,
  disabled,
  variant = "primary",
  style,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        styles[variant],
        disabled ? styles.disabled : null,
        state.pressed ? styles.pressed : null,
        typeof style === "function" ? style(state) : style
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === "secondary" ? styles.secondaryLabel : null]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  danger: {
    backgroundColor: "#d92d20"
  },
  disabled: {
    opacity: 0.45
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.75
  },
  primary: {
    backgroundColor: "#155eef"
  },
  secondary: {
    backgroundColor: "#e4e7ec"
  },
  secondaryLabel: {
    color: "#101828"
  }
});
