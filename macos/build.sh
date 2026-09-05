#!/bin/bash
# Skincare.app + DMG üretir. Kullanım: macos/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' macos/Info.plist)
BUILD=build
APP="$BUILD/Skincare.app"
rm -rf "$BUILD"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" "$BUILD/tmp"

echo "→ Swift derleniyor (arm64 + x86_64)"
swiftc -O -target arm64-apple-macos12 -framework Cocoa -framework WebKit macos/main.swift -o "$BUILD/tmp/Skincare-arm64"
swiftc -O -target x86_64-apple-macos12 -framework Cocoa -framework WebKit macos/main.swift -o "$BUILD/tmp/Skincare-x86_64"
lipo -create "$BUILD/tmp/Skincare-arm64" "$BUILD/tmp/Skincare-x86_64" -output "$APP/Contents/MacOS/Skincare"

echo "→ Web dosyaları kopyalanıyor"
cp index.html styles.css data.js i18n.js app.js manifest.json icon.svg "$APP/Contents/Resources/web/"
[ -f icon.png ] && cp icon.png "$APP/Contents/Resources/web/"
[ -d img ] && cp -R img "$APP/Contents/Resources/web/"
cp macos/Info.plist "$APP/Contents/Info.plist"

echo "→ Simge üretiliyor"
if [ -f macos/icon-1024.png ]; then SRC=macos/icon-1024.png; else qlmanage -t -s 1024 -o "$BUILD/tmp" icon.svg >/dev/null 2>&1; SRC="$BUILD/tmp/icon.svg.png"; fi
ICONSET="$BUILD/tmp/AppIcon.iconset"; mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$SRC" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  d=$((s*2)); sips -z $d $d "$SRC" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

echo "→ Ad-hoc imza"
codesign --force --deep -s - "$APP"

echo "→ DMG"
DMGROOT="$BUILD/dmgroot"; mkdir -p "$DMGROOT"
cp -R "$APP" "$DMGROOT/"
ln -s /Applications "$DMGROOT/Applications"
hdiutil create -volname "Skincare" -srcfolder "$DMGROOT" -ov -format UDZO "$BUILD/Skincare-$VERSION.dmg" >/dev/null
rm -rf "$BUILD/tmp" "$DMGROOT"
echo "✓ $BUILD/Skincare-$VERSION.dmg"
ls -la "$BUILD"
