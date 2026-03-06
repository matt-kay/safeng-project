import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';
import type { ComponentProps } from 'react';

export function ExternalLink(
  props: ComponentProps<typeof Link>
) {
  return (
    <Link
      target="_blank"
      {...props}
      onPress={(e) => {
        if (Platform.OS !== 'web' && typeof props.href === 'string') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(props.href);
        }
      }}
    />
  );
}
