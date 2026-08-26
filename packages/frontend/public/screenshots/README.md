# PWA Screenshots

This directory contains screenshots for the Progressive Web App store listing and installation prompts.

## Screenshot Requirements

Screenshots are displayed in:
- Play Store / App Store installation prompts
- PWA installation dialogs
- Web app manifest browser UI
- App listing pages

## Screenshot Sizes

### Narrow Form Factor (Mobile)
- **540x720px**: Portrait orientation for mobile devices
- **2-3 screenshots recommended**
- Examples: Dashboard, Transaction, History

### Wide Form Factor (Desktop/Tablet)
- **1280x720px**: Landscape orientation for desktop
- **1-2 screenshots recommended**
- Examples: Full dashboard, Reports view

## Screenshot Files

Expected format: `screenshot-{number}.png`

Examples:
- `screenshot-1.png` (540x720) - Mobile dashboard
- `screenshot-2.png` (1280x720) - Desktop view
- `screenshot-3.png` (540x720) - Mobile POS screen

## manifest.json Configuration

```json
{
  "screenshots": [
    {
      "src": "/screenshots/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/screenshot-2.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

## How to Create Screenshots

### Browser DevTools (Chrome/Edge)
1. Open DevTools (F12)
2. Click device toggle (mobile view)
3. Set to desired size (540x720 for mobile)
4. Right-click canvas → Capture Screenshot
5. Crop and optimize

### CLI Tools
```bash
# Using Puppeteer (Node.js)
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 720 });
  await page.goto('https://your-site.com');
  await page.screenshot({ path: 'screenshot-1.png' });
  await browser.close();
})();
```

### Design Tools
- Create mockups in Figma
- Use device frame templates
- Export as PNG

## Best Practices

### Design
- Show key features/functionality
- Use device frames to give context
- Include UI in natural state
- Avoid personal information
- Use consistent branding

### Content
- **Screenshot 1**: Dashboard/Home screen
- **Screenshot 2**: Main feature (POS/Transactions)
- **Screenshot 3**: Secondary feature (Reports/History)

### Technical
- **Format**: PNG 32-bit with transparency
- **Size**: Match exact dimensions
- **Quality**: Minimum 72 DPI, recommend 96+ DPI
- **File size**: Keep under 200KB each

## Screenshot Content Ideas

1. **Dashboard/Home**
   - Overview of key metrics
   - Recent activity
   - Quick actions
   - Professional appearance

2. **Transaction Screen**
   - Product selection
   - Shopping cart
   - Payment options
   - Shows main functionality

3. **Reports/History**
   - Data visualization
   - Charts and graphs
   - List view of transactions
   - Analysis features

4. **Mobile Menu**
   - Navigation structure
   - Role-specific features
   - Accessibility features

## Optimization

```bash
# Optimize screenshots
pngquant screenshot-1.png --ext .png --force --speed 1

# Compress with optipng
optipng -o2 screenshot-1.png

# Or use ImageOptim (Mac) or Squoosh (Web)
```

## Testing Screenshots

1. Check manifest.json references
2. Verify file paths are correct
3. Test on actual devices/browsers
4. Check display in installation dialog
5. Validate file sizes and quality

## Common Issues

### Screenshots not showing
- Verify file exists at correct path
- Check manifest.json syntax
- Ensure form_factor matches size
- Clear browser cache

### Blurry screenshots
- Use correct DPI (96+ recommended)
- Avoid scaling/resizing
- Check device pixel ratio
- Use vector graphics where possible

### Too large files
- Compress with pngquant or optipng
- Reduce dimensions if possible
- Convert to WebP format (supported browsers)
- Remove unnecessary metadata

## Dimensions Quick Reference

```
Narrow (Mobile):
- 540 × 720 px
- Portrait orientation
- For phones

Wide (Tablet/Desktop):
- 1280 × 720 px (or 1024 × 768)
- Landscape orientation
- For larger screens

Target Aspect Ratios:
- Narrow: 3:4 (0.75)
- Wide: 16:9 (1.77) or 4:3 (1.33)
```

## File Structure

```
public/screenshots/
├── screenshot-1.png        (540x720) - Mobile dashboard
├── screenshot-2.png        (1280x720) - Desktop view
└── README.md              (This file)
```

## References

- [Web App Screenshots - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest/screenshots)
- [Screenshot Best Practices](https://developer.chrome.com/docs/web-platform/best-practices/#screenshots)
- [PWA Installation UI](https://web.dev/install-criteria/#screenshots)
- [Puppeteer - Screenshot Guide](https://pptr.dev/api/puppeteer.page.screenshot)
