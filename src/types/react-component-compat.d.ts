// @expo/vector-icons Icon<G, FN> declares only `new(props: IconProps<G>)` (no context arg).
// React's JSXElementConstructor requires `new(props: P, context: any) => Component<any, any>`.
// Augmenting the Icon interface to add the context overload satisfies the JSX check.
// Interface augmentations are placed before original overloads, so this overload is tried first.
import type React from 'react';
import type { IconProps } from '@expo/vector-icons/build/createIconSet';

declare module '@expo/vector-icons/build/createIconSet' {
  interface Icon<G extends string, FN extends string> {
    new(props: IconProps<G>, context: any): React.Component<any, any>;
  }
}
