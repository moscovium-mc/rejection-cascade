Icon Generation Instructions

Required icon sizes:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)  
- icon128.png (128x128 pixels)

Quick generation using ImageMagick:
convert -size 128x128 xc:#ffffff -font Arial -pointsize 80 -fill #000000 -draw "text 20,85 'RC'" icons/icon128.png
convert -size 48x48 xc:#ffffff -font Arial -pointsize 30 -fill #000000 -draw "text 8,35 'RC'" icons/icon48.png
convert -size 16x16 xc:#ffffff -font Arial -pointsize 12 -fill #000000 -draw "text 2,12 'RC'" icons/icon16.png

Or create using any image editor with:
- Background: white (#ffffff)
- Text: "RC" in black (#000000)
- Font: sans-serif

The extension will function without proper icons, showing a default puzzle piece instead.