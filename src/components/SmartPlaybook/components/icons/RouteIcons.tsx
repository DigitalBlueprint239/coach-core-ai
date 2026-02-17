/**
 * RouteIcons.tsx - SVG micro-icons for each of the 12 core routes
 *
 * Each icon is a 24x24 SVG showing the distinctive shape of the route.
 * Coordinate system: bottom-center is the player, routes go upward.
 * All icons use currentColor for stroke, making them theme-adaptable.
 */

import React, { memo } from 'react';

const iconProps = {
  viewBox: '0 0 24 24',
  className: 'w-5 h-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Screen/Bubble - lateral release */
export const ScreenIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L20 19" />
    <path d="M18 17 L20 19 L18 21" strokeWidth="1.5" />
  </svg>
));
ScreenIcon.displayName = 'ScreenIcon';

/** Flat - immediate outside break, shallow depth */
export const FlatIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L13 17 L20 15" />
    <path d="M18 13 L20 15 L18 17" strokeWidth="1.5" />
  </svg>
));
FlatIcon.displayName = 'FlatIcon';

/** Slant - 3-step vertical then inside break */
export const SlantIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 14 L6 8" />
    <path d="M8 6 L6 8 L8 10" strokeWidth="1.5" />
  </svg>
));
SlantIcon.displayName = 'SlantIcon';

/** Comeback - deep vertical then break back to sideline */
export const ComebackIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 6 L16 10" />
    <path d="M14 12 L16 10 L18 12" strokeWidth="1.5" />
  </svg>
));
ComebackIcon.displayName = 'ComebackIcon';

/** Curl - vertical then stop and come back */
export const CurlIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 7 L12 10" />
    <path d="M10 8 L12 10 L14 8" strokeWidth="1.5" />
  </svg>
));
CurlIcon.displayName = 'CurlIcon';

/** Out - vertical stem then 90-degree outside break */
export const OutIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 12 L20 12" />
    <path d="M18 10 L20 12 L18 14" strokeWidth="1.5" />
  </svg>
));
OutIcon.displayName = 'OutIcon';

/** Dig/In - vertical stem then inside break */
export const DigIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 12 L4 12" />
    <path d="M6 10 L4 12 L6 14" strokeWidth="1.5" />
  </svg>
));
DigIcon.displayName = 'DigIcon';

/** Corner - vertical stem then outside-deep break */
export const CornerIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 13 L19 5" />
    <path d="M17 3 L19 5 L17 7" strokeWidth="1.5" />
  </svg>
));
CornerIcon.displayName = 'CornerIcon';

/** Post - vertical stem then inside-deep break */
export const PostIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 13 L6 5" />
    <path d="M8 3 L6 5 L4 3" strokeWidth="1.5" />
  </svg>
));
PostIcon.displayName = 'PostIcon';

/** Go/Fade - straight vertical */
export const GoIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 5" />
    <path d="M10 7 L12 5 L14 7" strokeWidth="1.5" />
  </svg>
));
GoIcon.displayName = 'GoIcon';

/** Hitch - short vertical then stop/turn back */
export const HitchIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M12 20 L12 12 L12 14" />
    <path d="M10 13 L12 15 L14 13" strokeWidth="1.5" />
  </svg>
));
HitchIcon.displayName = 'HitchIcon';

/** Shallow Cross - lateral across formation */
export const ShallowCrossIcon = memo(() => (
  <svg {...iconProps}>
    <circle cx="18" cy="20" r="2" fill="currentColor" stroke="none" />
    <path d="M18 20 L16 16 L4 14" />
    <path d="M6 12 L4 14 L6 16" strokeWidth="1.5" />
  </svg>
));
ShallowCrossIcon.displayName = 'ShallowCrossIcon';

/** Maps route IDs to their icon components */
const ROUTE_ICON_MAP: Record<string, React.FC> = {
  'screen_0': ScreenIcon,
  'screen': ScreenIcon,
  'flat_1': FlatIcon,
  'flat': FlatIcon,
  'slant_2': SlantIcon,
  'slant': SlantIcon,
  'comeback_3': ComebackIcon,
  'comeback': ComebackIcon,
  'curl_4': CurlIcon,
  'curl': CurlIcon,
  'out_5': OutIcon,
  'out': OutIcon,
  'dig_6': DigIcon,
  'dig': DigIcon,
  'in': DigIcon,
  'corner_7': CornerIcon,
  'corner': CornerIcon,
  'post_8': PostIcon,
  'post': PostIcon,
  'go_9': GoIcon,
  'go': GoIcon,
  'hitch_5': HitchIcon,
  'hitch': HitchIcon,
  'shallow_cross_5': ShallowCrossIcon,
  'shallow_cross': ShallowCrossIcon,
};

/**
 * Returns the appropriate route icon component for a given route ID or name.
 */
export function getRouteIcon(routeIdOrName: string): React.FC {
  const key = routeIdOrName.toLowerCase().replace(/[\s/]/g, '_');
  return ROUTE_ICON_MAP[key] || GoIcon;
}

/**
 * RouteIcon component that renders the correct icon for a given route.
 */
export const RouteIcon = memo<{ routeId: string }>(({ routeId }) => {
  const Icon = getRouteIcon(routeId);
  return <Icon />;
});
RouteIcon.displayName = 'RouteIcon';
