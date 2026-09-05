// Kaynak fotoğraftan uygulama ikonu üretir: köşelerden bağlı açık arka planı şeffaflaştırır,
// çiçeği yuvarlak köşeli pembe zemine ortalar, 1024x1024 PNG yazar.
// Kullanım: swift macos/makeicon.swift <kaynak.png> <çıktı.png> [zeminHex]
import AppKit

let args = CommandLine.arguments
guard args.count >= 3, let src = NSImage(contentsOfFile: args[1]), let cg0 = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("kullanım: makeicon <kaynak.png> <çıktı.png> [zeminHex]\n".data(using: .utf8)!); exit(1)
}
let bgHex = args.count > 3 ? args[3] : "FFF6FC"
func hexColor(_ h: String) -> NSColor {
    var s = h.replacingOccurrences(of: "#", with: ""); if s.count == 6 { s += "FF" }
    let v = UInt32(s, radix: 16) ?? 0xFFF6FCFF
    return NSColor(srgbRed: CGFloat((v >> 24) & 0xff) / 255, green: CGFloat((v >> 16) & 0xff) / 255, blue: CGFloat((v >> 8) & 0xff) / 255, alpha: 1)
}

// --- RGBA tampon
let w = cg0.width, h = cg0.height
var buf = [UInt8](repeating: 0, count: w * h * 4)
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(cg0, in: CGRect(x: 0, y: 0, width: w, height: h))

// --- köşelerden bağlı açık arka planı bul (flood fill)
func isBackground(_ i: Int) -> Bool {
    let r = Int(buf[i*4]), g = Int(buf[i*4+1]), b = Int(buf[i*4+2]), a = Int(buf[i*4+3])
    if a < 20 { return true }
    let mx = max(r, g, b), mn = min(r, g, b)
    return mn > 226 && (mx - mn) < 24   // çok açık ve nötr (bağlı arka plan)
}
var mark = [Bool](repeating: false, count: w * h)
var stack: [Int] = []
for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w / 2, 0), (w / 2, h - 1), (0, h / 2), (w - 1, h / 2)] {
    let i = y * w + x; if isBackground(i) && !mark[i] { mark[i] = true; stack.append(i) }
}
while let i = stack.popLast() {
    let x = i % w, y = i / w
    for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
        let j = ny * w + nx
        if !mark[j] && isBackground(j) { mark[j] = true; stack.append(j) }
    }
}
// maske: arka plan 0, çiçek 255; 2 px aşındır (beyaz hale gider), sonra 2 px yumuşat
var alpha = [UInt8](repeating: 255, count: w * h)
for i in 0..<(w * h) where mark[i] { alpha[i] = 0 }
func erode(_ m: [UInt8], _ r: Int) -> [UInt8] {
    var o = m
    for y in 0..<h { for x in 0..<w {
        let i = y * w + x; if m[i] == 0 { continue }
        var hit = false
        for dy in -r...r { for dx in -r...r {
            let nx = x + dx, ny = y + dy
            if nx < 0 || ny < 0 || nx >= w || ny >= h || m[ny * w + nx] == 0 { hit = true }
        }}
        if hit { o[i] = 0 }
    }}
    return o
}
let eroded = erode(alpha, 3)
// kenar yumuşatma: aşınmış maskenin kenarındaki piksellere uzaklığa göre alfa
var soft = eroded
for y in 0..<h { for x in 0..<w {
    let i = y * w + x; if eroded[i] == 0 { continue }
    var dmin = 3
    for dy in -2...2 { for dx in -2...2 {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h || eroded[ny * w + nx] == 0 { dmin = min(dmin, max(abs(dx), abs(dy))) }
    }}
    if dmin < 3 { soft[i] = UInt8(min(255, 70 + dmin * 90)) }
}}
var out = [UInt8](repeating: 0, count: w * h * 4)
var minX = w, minY = h, maxX = 0, maxY = 0
for i in 0..<(w * h) {
    let a = Int(soft[i]); if a == 0 { continue }
    let r = Int(buf[i*4]), g = Int(buf[i*4+1]), b = Int(buf[i*4+2])
    out[i*4] = UInt8(r * a / 255); out[i*4+1] = UInt8(g * a / 255); out[i*4+2] = UInt8(b * a / 255); out[i*4+3] = UInt8(a)
    let x = i % w, y = i / w
    minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
}
let cut = CGContext(data: &out, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let flowerFull = cut.makeImage()!
let crop = flowerFull.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1))!

// --- 1024 tuval: yuvarlak köşeli zemin + ortalanmış çiçek
let S = 1024
var canvas = [UInt8](repeating: 0, count: S * S * 4)
let c = CGContext(data: &canvas, width: S, height: S, bitsPerComponent: 8, bytesPerRow: S * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let inset: CGFloat = 100 // Apple ikon ızgarası: 1024 tuvalde 824 içerik
let rect = CGRect(x: inset, y: inset, width: CGFloat(S) - 2 * inset, height: CGFloat(S) - 2 * inset)
let path = CGPath(roundedRect: rect, cornerWidth: rect.width * 0.2237, cornerHeight: rect.height * 0.2237, transform: nil)
c.addPath(path); c.setFillColor(hexColor(bgHex).cgColor); c.fillPath()
c.addPath(path); c.clip()
let fw = CGFloat(crop.width), fh = CGFloat(crop.height)
let scale = min((rect.width * 0.94) / fw, (rect.height * 0.94) / fh)
let dw = fw * scale, dh = fh * scale
c.interpolationQuality = .high
c.draw(crop, in: CGRect(x: rect.midX - dw / 2, y: rect.midY - dh / 2, width: dw, height: dh))
let img = c.makeImage()!
let rep = NSBitmapImageRep(cgImage: img)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
print("ok \(crop.width)x\(crop.height) → \(args[2])")
