/**
 * Carbon Design System Icons
 * 
 * Comprehensive icon library using Carbon icons.
 * Replaces all unicode symbols with proper SVG icons.
 */

'use client';

import React from 'react';

// Icon SVG components following Carbon design
const iconRegistry = {
  // Navigation
  dashboard: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M24 21h2v5h-2zm-4-5h2v10h-2zm-4 5h2v5h-2zm-4-5h2v10h-2zm-4 5h2v5H8z" />
      <path d="M4 28h24v2H4zm0-26h2v24H4zm22 0h2v24h-2zM4 4h24v2H4z" />
    </svg>
  ),
  calendar: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 4h-4V2h-2v2h-8V2h-2v2H6c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 22H6V12h20v14zm0-16H6V6h4v2h2V6h8v2h2V6h4v4z" />
    </svg>
  ),
  table: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M8 18h6v6H8zm10 0h6v6h-6zM8 10h6v6H8zm10 0h6v6h-6z" />
      <path d="M4 24V8c0-1.1.9-2 2-2h20c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2zm2 0h20V8H6v16z" />
    </svg>
  ),
  user: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 8a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z" />
      <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm-7 23.9v-2.2c0-1.1.9-2.1 2.1-2.1h9.8c1.1 0 2.1.9 2.1 2.1v2.2c-2 1.5-4.5 2.4-7 2.4s-5-.9-7-2.4zm9.1-3.1H11c-.6 0-1 .4-1 1v1.6c1.7 1 3.7 1.5 6 1.5s4.3-.5 6-1.5v-1.6c0-.6-.4-1-1-1zM24.9 24c-.1-.3-.3-.5-.5-.8-.6-.7-1.4-1.1-2.3-1.1h-.5c.3-.9.4-1.9.4-2.9 0-3.9-2.1-7.3-5.3-9.1C16 7.5 13 9 11.1 11.4c-2 2.5-2.7 5.8-1.8 9h-.3c-.9 0-1.7.4-2.3 1.1-.2.3-.4.5-.5.8C5 22.2 4 19.2 4 16 4 9.4 9.4 4 16 4s12 5.4 12 12c0 3.2-1 6.2-2.7 8.7l-.4.3z" />
    </svg>
  ),
  users: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M6 30h20v-2H6v2zM22 13h-2v-2h2c3.9 0 7-3.1 7-7s-3.1-7-7-7-7 3.1-7 7v2h2v-2c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5z" />
      <path d="M10 13H8c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7v2h-2v-2c0-2.8-2.2-5-5-5s-5 2.2-5 5 2.2 5 5 5z" />
      <path d="M22 16h-2c-4.4 0-8 3.6-8 8v2h2v-2c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v2h2v-2c0-4.4-3.6-8-8-8z" />
      <path d="M10 16H8c-4.4 0-8 3.6-8 8v2h2v-2c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v2h2v-2c0-4.4-3.6-8-8-8z" />
    </svg>
  ),
  container: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M28 12H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V14c0-1.1-.9-2-2-2zm0 14H4V14h24v12z" />
      <path d="M16 4c-3.3 0-6 2.7-6 6h2c0-2.2 1.8-4 4-4s4 1.8 4 4h2c0-3.3-2.7-6-6-6z" />
    </svg>
  ),
  chart: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M4 28h28v2H4z" />
      <path d="M4 24v-2h4v2H4zm6-8v-2h4v2h-4zm6 4v-2h4v2h-4zm6-6V12h4v2h-4zM4 6h26v2H4z" />
      <path d="M26 4v14h-4V4h4m2-2h-8v18h8V2zM8 10v14H4V10h4m2-2H2v18h8V8z" />
    </svg>
  ),
  flag: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M6 30H4V2h24l-6 8 6 8H6v12z" />
    </svg>
  ),
  
  // Actions
  add: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M17 15V7h-2v8H7v2h8v8h2v-8h8v-2h-8z" />
    </svg>
  ),
  close: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z" />
    </svg>
  ),
  checkmark: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M13 24L4 15l-1.4 1.4L13 27 29 11l-1.4-1.4L13 24z" />
    </svg>
  ),
  edit: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M25.8 9.6l-3.4-3.4c-.4-.4-1-.4-1.4 0l-12 12c-.2.2-.3.4-.3.7v4c0 .6.4 1 1 1h4c.3 0 .5-.1.7-.3l12-12c.4-.4.4-1 0-1.4zM12 22v-2.6l9.6-9.6 2.6 2.6L14.6 22H12z" />
      <path d="M27 28H5V6h12V4H5c-1.1 0-2 .9-2 2v22c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2v-9h-2v9z" />
    </svg>
  ),
  trash: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M12 12h2v12h-2zm6 0h2v12h-2z" />
      <path d="M4 6v2h2v20c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8h2V6H4zm4 22V8h16v20H8z" />
      <path d="M12 2h8v2h-8z" />
    </svg>
  ),
  download: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 24v4H6v-4H4v4c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2v-4h-2z" />
      <path d="M26 14l-1.4-1.4-7.6 7.6V4h-2v16.2l-7.6-7.6L6 14l10 10 10-10z" />
    </svg>
  ),
  print: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M28 9h-3V3H7v6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h3v6h18v-6h3c1.1 0 2-.9 2-2V11c0-1.1-.9-2-2-2zM9 5h14v4H9V5zm14 22H9v-8h14v8zm5-6h-3v-2H7v2H4V11h24v10z" />
    </svg>
  ),
  search: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M29 27.6l-7.5-7.5c1.3-1.8 2.1-4 2.1-6.3 0-6.1-4.9-11-11-11S2 7.7 2 13.8s4.9 11 11 11c2.4 0 4.5-.8 6.3-2.1l7.5 7.5 1.4-1.4-1.2-1.2zM4 13.8c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z" />
    </svg>
  ),
  settings: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M27 16c0-.5-.1-1-.2-1.5l2.7-2.2-2-3.5-3.4 1.3c-.8-.7-1.7-1.2-2.7-1.6L21 5h-4l-.4 3.5c-1 .4-1.9.9-2.7 1.6l-3.4-1.3-2 3.5 2.7 2.2c-.1.5-.2 1-.2 1.5s.1 1 .2 1.5l-2.7 2.2 2 3.5 3.4-1.3c.8.7 1.7 1.2 2.7 1.6l.4 3.5h4l.4-3.5c1-.4 1.9-.9 2.7-1.6l3.4 1.3 2-3.5-2.7-2.2c.1-.5.2-1 .2-1.5zm-4.2 5.7l-2.6 1-1.9 1.5-.5 2.5h-1.6l-.5-2.5-1.9-1.5-2.6-1-.7-1.4 2-1.6.5-2.1-.1-2.1-2-1.6.7-1.4 2.6 1 1.9-1.5.5-2.5h1.6l.5 2.5 1.9 1.5 2.6 1 .7 1.4-2 1.6-.5 2.1.1 2.1 2 1.6-.7 1.4z" />
      <circle cx="16" cy="16" r="2" />
    </svg>
  ),
  
  // Communication
  phone: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 29h-.2C6.1 27.4 2.8 11.7 2 6.4c-.2-1.3.8-2.4 2.1-2.4h4.6c.9 0 1.7.6 1.9 1.4l1.1 4.4c.2.7-.1 1.5-.7 1.9l-2.5 1.8c1.1 3.8 3.1 7.1 5.9 9.8 2.7 2.7 6 4.7 9.8 5.9l1.8-2.5c.4-.6 1.2-.9 1.9-.7l4.4 1.1c.8.2 1.4 1 1.4 1.9v4.6c0 1.3-1.1 2.3-2.4 2.1zM7.3 6.6l.3 1.8c2.9 4.9 6.8 8.8 11.7 11.7l1.8.3c1.9-2.6 1.9-2.6 3.6-4.3-8.8-4.4-12.8-8.4-17.4-9.5z" />
    </svg>
  ),
  email: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M28 6H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 4.2l-12 8.8-12-8.8V8l12 8.8L28 8v2.2z" />
    </svg>
  ),
  location: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 2C10.5 2 6 6.5 6 12c0 4.3 2.6 8.5 7 12.5 1.6 1.3 2 1.5 3 2.5 1-1 1.4-1.2 3-2.5 4.4-4 7-8.2 7-12.5 0-5.5-4.5-10-10-10zm0 24.3c-1.6-1.3-5-4.3-5-8.3 0-2.8 2.2-5 5-5s5 2.2 5 5c0 4-3.4 7-5 8.3z" />
      <circle cx="16" cy="13" r="3" />
    </svg>
  ),
  time: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 30C8.3 30 2 23.7 2 16S8.3 2 16 2s14 6.3 14 14-6.3 14-14 14zm0-26C9.4 4 4 9.4 4 16s5.4 12 12 12 12-5.4 12-12S22.6 4 16 4z" />
      <path d="M20.6 23.4L15 17.8V7h2v9.2l4.6 4.6-1.4 1.4z" />
    </svg>
  ),
  whatsapp: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 3C8.8 3 3 8.8 3 16c0 2.4.7 4.7 1.9 6.7L3.3 29l6.6-1.6c1.9 1 4 1.6 6.1 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3zm6.6 18.4c-.3.8-1.7 1.6-2.4 1.7-.6.1-1.2.1-1.7-.1-.4-.1-.9-.3-1.4-.5-2.4-1-4-3.5-4.1-3.7-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.8.2-.2.5-.3.6-.3.2 0 .3 0 .4.1.2.1.4.5.5.7.2.3.2.5.3.6.1.2.1.4 0 .5-.1.2-.2.3-.3.4-.1.1-.2.2-.3.3-.1.1-.2.2-.2.3-.1.2 0 .4.1.6.3.5.7 1 1.2 1.3.5.4 1 .6 1.2.7.2.1.4 0 .5-.1.1-.1.3-.3.4-.5.1-.2.2-.3.4-.4.1-.1.3-.1.5 0 .2.1 1.2.6 1.4.7.2.1.4.2.4.3.1.2.1.9-.2 1.6z" />
    </svg>
  ),
  
  // Navigation arrows
  chevronDown: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 22L6 12l1.4-1.4L16 19.2l8.6-8.6L26 12z" />
    </svg>
  ),
  chevronUp: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 10l10 10-1.4 1.4L16 12.8l-8.6 8.6L6 20z" />
    </svg>
  ),
  chevronLeft: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M10 16l10-10 1.4 1.4L12.8 16l8.6 8.6L20 26z" />
    </svg>
  ),
  chevronRight: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M22 16L12 26l-1.4-1.4L19.2 16l-8.6-8.6L12 6z" />
    </svg>
  ),
  arrowRight: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M18 6l-1.4 1.4 7.6 7.6H4v2h20.2l-7.6 7.6L18 26l10-10z" />
    </svg>
  ),
  menu: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M4 6h24v2H4zm0 9h24v2H4zm0 9h24v2H4z" />
    </svg>
  ),
  logout: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M6 30h12c1.1 0 2-.9 2-2v-6h-2v6H6V4h12v6h2V4c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v24c0 1.1.9 2 2 2z" />
      <path d="M20.6 21.4L25 17H12v-2h13l-4.4-4.4 1.4-1.4 7 7-7 7-1.4-1.4z" />
    </svg>
  ),
  
  // Status
  warning: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z" />
      <path d="M15 8h2v10h-2zm0 12h2v2h-2z" />
    </svg>
  ),
  error: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm5.4 21L16 17.6 10.6 23 9 21.4l5.4-5.4L9 10.6 10.6 9l5.4 5.4L21.4 9l1.6 1.6-5.4 5.4 5.4 5.4-1.6 1.6z" />
    </svg>
  ),
  info: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z" />
      <path d="M15 8h2v2h-2zm0 4h2v12h-2z" />
    </svg>
  ),
  help: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z" />
      <path d="M17 22h-2v-2h2v2zm2.1-7.7c-.5.6-1.1 1-1.6 1.4-.4.2-.6.4-.7.6-.1.2-.2.5-.2.8v.9h-2v-.9c0-.5.1-1 .4-1.4.3-.4.7-.8 1.3-1.1.6-.4 1-.7 1.2-1 .3-.3.4-.6.4-1 0-.5-.2-.9-.5-1.2-.3-.3-.8-.5-1.3-.5s-1 .2-1.3.5c-.3.3-.5.7-.5 1.3h-2c0-1 .3-1.8 1-2.4.7-.6 1.5-.9 2.5-.9s1.9.3 2.6 1c.6.6 1 1.4 1 2.4.2.6-.1 1.2-.5 1.5z" />
    </svg>
  ),
  
  // Media
  play: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M7 28V4l22 12L7 28z" />
    </svg>
  ),
  stop: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <rect x="6" y="6" width="20" height="20" />
    </svg>
  ),
  pause: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M12 6h-2v20h2V6zm10 0h-2v20h2V6z" />
    </svg>
  ),
  camera: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M29 26H3a1 1 0 01-1-1V9a1 1 0 011-1h6.46l1.71-2.55A1 1 0 0112 5h8a1 1 0 01.83.45L22.54 8H29a1 1 0 011 1v16a1 1 0 01-1 1zM4 24h24V10h-6a1 1 0 01-.83-.45L19.46 7h-6.92l-1.71 2.55A1 1 0 0110 10H4v14z" />
      <path d="M16 22a6 6 0 116-6 6 6 0 01-6 6zm0-10a4 4 0 104 4 4 4 0 00-4-4z" />
    </svg>
  ),
  
  // File operations
  document: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M25.7 9.3l-7-7A.9.9 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.9.9 0 00-.3-.7zM18 4.4l5.6 5.6H18V4.4zM24 28H8V4h8v6a2 2 0 002 2h6v16z" />
    </svg>
  ),
  copy: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M28 10v18H10V10h18m0-2H10a2 2 0 00-2 2v18a2 2 0 002 2h18a2 2 0 002-2V10a2 2 0 00-2-2z" />
      <path d="M4 18H2V5a2 2 0 012-2h13v2H4z" />
    </svg>
  ),
  
  // Misc
  filter: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M18 28h-4v-8.8l-7.5-9.9V8h22v1.3l-7.5 9.9V28zm-2-2h2v-8.3l7.5-9.9V10H9.5v1.8l7.5 9.9V26z" />
    </svg>
  ),
  sort: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 28l-7-7 1.4-1.4L16 25.2l5.6-5.6L23 21l-7 7zM16 4l7 7-1.4 1.4L16 6.8l-5.6 5.6L9 11l7-7z" />
    </svg>
  ),
  refresh: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 18A10 10 0 116 18h2a8 8 0 101.3-4.3L10 14H4V8l2.2 2.2A10 10 0 0126 18z" />
    </svg>
  ),
  launch: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 26H6V6h9V4H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2v-9h-2v9z" />
      <path d="M26 6V2h-2v4h-4v2h4v4h2V8h4V6h-4z" />
    </svg>
  ),
  folder: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M11.17 6l-2-2H4v20h24V6H11.17zm10.83 14H6V8h16v12z" />
    </svg>
  ),
  license: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 6H6v2h20V6zM22 10H6v2h16v-2zM6 14h20v2H6zM18 18H6v2h12v-2zM6 22h14v2H6z" />
      <path d="M22 22h8v2h-8zM26 18h4v2h-4z" />
    </svg>
  ),
  certificate: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M24 16v10l-4-2-4 2V16H8v14h24V16h-8zm-2 2h4v10l-2-1-2 1V18z" />
      <path d="M4 30V6h12V4H2v26h12v-2H4z" />
      <path d="M28 6V4h-4V2h-2v2h-4V2h-2v2h-4v2h4v2h2V8h4v2h2V8h4z" />
    </svg>
  ),
  check: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M13 24L4 15l-1.4 1.4L13 27 29 11l-1.4-1.4L13 24z" />
    </svg>
  ),
  checkbox: (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 4H6c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 22H6V6h20v20z" />
    </svg>
  ),
  'checkbox-checked': (props: IconProps) => (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M26 4H6c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2.7 8.3l-9 9c-.2.2-.4.3-.7.3s-.5-.1-.7-.3l-4-4c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l3.3 3.3 8.3-8.3c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4z" />
    </svg>
  ),
};

interface IconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export type IconName = keyof typeof iconRegistry;

interface IconComponentProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function Icon({ name, size = 20, className, style, title }: IconComponentProps) {
  const IconSvg = iconRegistry[name];
  
  if (!IconSvg) {
    console.warn(`Icon "${name}" not found in registry`);
    return null;
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <IconSvg width={size} height={size} />
    </span>
  );
}

// Quick access exports
export const Icons = {
  dashboard: (props: Omit<IconComponentProps, 'name'>) => <Icon name="dashboard" {...props} />,
  calendar: (props: Omit<IconComponentProps, 'name'>) => <Icon name="calendar" {...props} />,
  jobs: (props: Omit<IconComponentProps, 'name'>) => <Icon name="table" {...props} />,
  customers: (props: Omit<IconComponentProps, 'name'>) => <Icon name="user" {...props} />,
  gasStock: (props: Omit<IconComponentProps, 'name'>) => <Icon name="container" {...props} />,
  gasUsage: (props: Omit<IconComponentProps, 'name'>) => <Icon name="chart" {...props} />,
  crm: (props: Omit<IconComponentProps, 'name'>) => <Icon name="chart" {...props} />,
  odsReport: (props: Omit<IconComponentProps, 'name'>) => <Icon name="license" {...props} />,
  users: (props: Omit<IconComponentProps, 'name'>) => <Icon name="users" {...props} />,
  add: (props: Omit<IconComponentProps, 'name'>) => <Icon name="add" {...props} />,
  close: (props: Omit<IconComponentProps, 'name'>) => <Icon name="close" {...props} />,
  checkmark: (props: Omit<IconComponentProps, 'name'>) => <Icon name="checkmark" {...props} />,
  check: (props: Omit<IconComponentProps, 'name'>) => <Icon name="check" {...props} />,
  edit: (props: Omit<IconComponentProps, 'name'>) => <Icon name="edit" {...props} />,
  delete: (props: Omit<IconComponentProps, 'name'>) => <Icon name="trash" {...props} />,
  download: (props: Omit<IconComponentProps, 'name'>) => <Icon name="download" {...props} />,
  print: (props: Omit<IconComponentProps, 'name'>) => <Icon name="print" {...props} />,
  search: (props: Omit<IconComponentProps, 'name'>) => <Icon name="search" {...props} />,
  settings: (props: Omit<IconComponentProps, 'name'>) => <Icon name="settings" {...props} />,
  phone: (props: Omit<IconComponentProps, 'name'>) => <Icon name="phone" {...props} />,
  email: (props: Omit<IconComponentProps, 'name'>) => <Icon name="email" {...props} />,
  location: (props: Omit<IconComponentProps, 'name'>) => <Icon name="location" {...props} />,
  time: (props: Omit<IconComponentProps, 'name'>) => <Icon name="time" {...props} />,
  whatsapp: (props: Omit<IconComponentProps, 'name'>) => <Icon name="whatsapp" {...props} />,
  chevronDown: (props: Omit<IconComponentProps, 'name'>) => <Icon name="chevronDown" {...props} />,
  chevronUp: (props: Omit<IconComponentProps, 'name'>) => <Icon name="chevronUp" {...props} />,
  chevronLeft: (props: Omit<IconComponentProps, 'name'>) => <Icon name="chevronLeft" {...props} />,
  chevronRight: (props: Omit<IconComponentProps, 'name'>) => <Icon name="chevronRight" {...props} />,
  arrowRight: (props: Omit<IconComponentProps, 'name'>) => <Icon name="arrowRight" {...props} />,
  menu: (props: Omit<IconComponentProps, 'name'>) => <Icon name="menu" {...props} />,
  logout: (props: Omit<IconComponentProps, 'name'>) => <Icon name="logout" {...props} />,
  warning: (props: Omit<IconComponentProps, 'name'>) => <Icon name="warning" {...props} />,
  error: (props: Omit<IconComponentProps, 'name'>) => <Icon name="error" {...props} />,
  info: (props: Omit<IconComponentProps, 'name'>) => <Icon name="info" {...props} />,
  help: (props: Omit<IconComponentProps, 'name'>) => <Icon name="help" {...props} />,
  play: (props: Omit<IconComponentProps, 'name'>) => <Icon name="play" {...props} />,
  stop: (props: Omit<IconComponentProps, 'name'>) => <Icon name="stop" {...props} />,
  pause: (props: Omit<IconComponentProps, 'name'>) => <Icon name="pause" {...props} />,
  camera: (props: Omit<IconComponentProps, 'name'>) => <Icon name="camera" {...props} />,
  document: (props: Omit<IconComponentProps, 'name'>) => <Icon name="document" {...props} />,
  copy: (props: Omit<IconComponentProps, 'name'>) => <Icon name="copy" {...props} />,
  filter: (props: Omit<IconComponentProps, 'name'>) => <Icon name="filter" {...props} />,
  sort: (props: Omit<IconComponentProps, 'name'>) => <Icon name="sort" {...props} />,
  refresh: (props: Omit<IconComponentProps, 'name'>) => <Icon name="refresh" {...props} />,
  launch: (props: Omit<IconComponentProps, 'name'>) => <Icon name="launch" {...props} />,
  folder: (props: Omit<IconComponentProps, 'name'>) => <Icon name="folder" {...props} />,
  license: (props: Omit<IconComponentProps, 'name'>) => <Icon name="license" {...props} />,
  certificate: (props: Omit<IconComponentProps, 'name'>) => <Icon name="certificate" {...props} />,
  checkbox: (props: Omit<IconComponentProps, 'name'>) => <Icon name="checkbox" {...props} />,
  checkboxChecked: (props: Omit<IconComponentProps, 'name'>) => <Icon name="checkbox-checked" {...props} />,
};

export default Icon;
