/**
 * RouteIcons.js – SVG micro-icons for each route type
 * All icons: 32×32 viewBox, drawn from bottom (LOS) upward (downfield).
 * Inside-breaking routes show right-side receiver perspective (break left).
 */

import React from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────

const Icon = ({ size = 32, children, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    data-route-icon={title}
    role="presentation"
  >
    {children}
  </svg>
);

const Line = (props) => (
  <path
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    stroke="currentColor"
    fill="none"
    {...props}
  />
);

// ── Route Icons ─────────────────────────────────────────────────────────────

export const HitchIcon = ({ size = 32 }) => (
  <Icon size={size} title="Hitch route">
    {/* Straight up then curl back toward LOS */}
    <Line d="M16 30 L16 14" />
    <Line d="M16 14 L12 18" />
  </Icon>
);

export const SlantIcon = ({ size = 32 }) => (
  <Icon size={size} title="Slant route">
    {/* Short stem then diagonal inside break */}
    <Line d="M16 30 L16 20 L7 10" />
    <Line d="M7 10 L5 7" />
  </Icon>
);

export const PostIcon = ({ size = 32 }) => (
  <Icon size={size} title="Post route">
    {/* Vertical stem then break toward center/top */}
    <Line d="M16 30 L16 16 L10 6" />
    <Line d="M10 6 L8 3" />
  </Icon>
);

export const CornerIcon = ({ size = 32 }) => (
  <Icon size={size} title="Corner route">
    {/* Vertical stem then break toward sideline/outside */}
    <Line d="M16 30 L16 16 L22 6" />
    <Line d="M22 6 L24 3" />
  </Icon>
);

export const OutIcon = ({ size = 32 }) => (
  <Icon size={size} title="Out route">
    {/* Straight up then break to the outside */}
    <Line d="M16 30 L16 16 L26 16" />
    <Line d="M26 16 L29 16" />
  </Icon>
);

export const InIcon = ({ size = 32 }) => (
  <Icon size={size} title="In / Dig route">
    {/* Straight up then break inside */}
    <Line d="M16 30 L16 16 L6 16" />
    <Line d="M6 16 L3 16" />
  </Icon>
);

export const GoIcon = ({ size = 32 }) => (
  <Icon size={size} title="Go / Fly route">
    {/* Straight vertical */}
    <Line d="M16 30 L16 4" />
    <Line d="M16 4 L13 8 M16 4 L19 8" />
  </Icon>
);

export const CustomIcon = ({ size = 32 }) => (
  <Icon size={size} title="Custom route">
    {/* Freeform zigzag */}
    <Line d="M16 30 L16 22 L10 14 L16 8 L22 4" />
  </Icon>
);

export const ScreenIcon = ({ size = 32 }) => (
  <Icon size={size} title="Screen route">
    {/* Short stem, release to the flat/outside */}
    <Line d="M16 30 L16 24 L24 20" />
    <Line d="M24 20 L27 18" />
  </Icon>
);

export const CrossIcon = ({ size = 32 }) => (
  <Icon size={size} title="Cross / Crossing route">
    {/* Dig / crossing route with deeper stem */}
    <Line d="M16 30 L16 12 L4 12" />
    <Line d="M4 12 L2 12" />
  </Icon>
);

export const WheelIcon = ({ size = 32 }) => (
  <Icon size={size} title="Wheel route">
    {/* Out then up the sideline */}
    <Line d="M16 30 L16 22 L24 22 L24 6" />
    <Line d="M24 6 L21 10 M24 6 L27 10" />
  </Icon>
);

export const DriveIcon = ({ size = 32 }) => (
  <Icon size={size} title="Drive route">
    {/* Short inside break, then flat */}
    <Line d="M16 30 L16 20 L8 16" />
    <Line d="M8 16 L4 16" />
  </Icon>
);

// ── Icon Registry ────────────────────────────────────────────────────────────

export const ROUTE_ICONS = {
  hitch: HitchIcon,
  slant: SlantIcon,
  post: PostIcon,
  corner: CornerIcon,
  out: OutIcon,
  in: InIcon,
  go: GoIcon,
  custom: CustomIcon,
  screen: ScreenIcon,
  cross: CrossIcon,
  wheel: WheelIcon,
  drive: DriveIcon,
};

/**
 * Get the icon component for a route type.
 * Falls back to CustomIcon for unknown types.
 * @param {string} routeType
 * @returns {React.FC}
 */
export function getRouteIcon(routeType) {
  return ROUTE_ICONS[routeType] || CustomIcon;
}

export default ROUTE_ICONS;
