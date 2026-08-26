# PWA Icons

This directory contains the Progressive Web App icons used for:
- Home screen shortcuts (Android, iOS)
- Web app manifest
- Browser tabs

## Required Icon Sizes

- **192x192px**: Maskable and standard formats
- **512x512px**: Maskable and standard formats

## Icon Files

### Standard Icons
- `icon-192x192.png`: Standard app icon (192x192)
- `icon-512x512.png`: Standard app icon (512x512)

### Maskable Icons
- `icon-192x192-maskable.png`: Maskable format (192x192) for adaptive icons
- `icon-512x512-maskable.png`: Maskable format (512x512) for adaptive icons

## What are Maskable Icons?

Maskable icons are designed to work with adaptive icon display, where the OS may mask the icon with different shapes (circles, rounded squares, etc.) depending on the device.

Requirements for maskable icons:
- Safe zone: 80px padding from edge
- Icon should fit within a 192px circle
- No transparency outside the safe zone
- Clear, recognizable design

## How to Create Icons

### Option 1: Online Tools
- [Maskable.app](https://maskable.app) - Create maskable icons
- [Icon Generator](https://www.favicon-generator.org/) - Generate icons from image

### Option 2: Design Tools
- Adobe Photoshop or Illustrator
- Figma (free tier available)
- Canva (free tier available)

### Option 3: CLI Tools
```bash
# Using imagemagick
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 512x512 icon-512x512.png

# Using ImageOptim or TinyPNG for optimization
```

## Icon Specifications

### Dimensions
- **192x192px**: For Android home screen, browser tabs
- **512x512px**: For splash screens, installation prompts

### Format
- **PNG**: 32-bit PNG with transparency
- **Size**: Keep under 100KB for optimal loading

### Design Tips
- Use primary color (#2563EB) as accent
- Keep design simple and recognizable at small sizes
- Ensure good contrast
- Test on different backgrounds
- Include padding/breathing room

## Installation

1. Place icon files in this directory
2. Reference in `public/manifest.json`:
```json
{
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Testing Icons

1. Open DevTools (F12)
2. Go to Application > Manifest
3. Check that icons display correctly
4. Test installation prompt on supported browsers

## Browser Support

- **Android**: Supports adaptive icons (maskable)
- **iOS**: Uses manifest icon for home screen
- **Desktop**: Uses icon for browser tabs and shortcuts
- **Windows**: Creates app tile with icon

## Optimization

```bash
# Optimize PNG files without losing quality
pngquant icon-192x192.png --ext .png --force
optipng -o2 icon-192x192.png
```

## Common Issues

### Icon not appearing
- Check file format (must be PNG)
- Verify file size
- Clear browser cache
- Check manifest.json syntax

### Wrong size on device
- Ensure correct dimensions
- Check manifest specifies sizes
- Clear app cache and reinstall

### Blurry on high-DPI displays
- Provide higher resolution icons
- Use vector formats if possible
- Test on actual devices

## References

- [Web App Icons - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest/icons)
- [Maskable Icons - CSS Tricks](https://css-tricks.com/maskable-icons-android-adaptive-icons-for-your-pwa/)
- [Icon Best Practices - web.dev](https://web.dev/icon-explorer/)
