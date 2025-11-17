// src/ui/AccessiblePressable.tsx
import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

/**
 * Wrapper runt Pressable som:
 * - säkerställer minst 44x44 touch-yta
 * - lägger på ett default hitSlop om inget anges
 * - låter dig skicka in vanlig style-prop
 */
export type AccessiblePressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
};

export default function AccessiblePressable(
  props: AccessiblePressableProps
) {
  const { style, hitSlop, children, ...rest } = props;

  return (
    <Pressable
      {...rest}
      hitSlop={hitSlop ?? { top: 10, bottom: 10, left: 10, right: 10 }}
      style={(state) => {
        const base: ViewStyle = {
          // bara a11y-krav, ingen layout
          minHeight: 44,
          minWidth: 44,
        };

        const userStyle =
          typeof style === 'function' ? style(state) : style;

        return [base, userStyle, state.pressed && { opacity: 0.8 }];
      }}
    >
      {children}
    </Pressable>
  );
}