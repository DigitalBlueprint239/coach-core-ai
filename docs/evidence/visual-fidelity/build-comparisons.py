from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap

out = Path(__file__).resolve().parent
desktop = Image.open(out / 'reference-desktop-ui.png').convert('RGB')
phone = Image.open(out / 'reference-phone-ui.png').convert('RGB')
regular = 'C:/Windows/Fonts/segoeui.ttf'
bold = 'C:/Windows/Fonts/segoeuib.ttf'

def font(size, heavy=False):
    return ImageFont.truetype(bold if heavy else regular, size)

def board(kind, reference, image_name, caption):
    implementation = Image.open(out / image_name).convert('RGB')
    pane = 830 if kind != 'phone' else 390
    gap, margin, header, footer = 28, 28, 110, 132
    a = reference.resize((pane, round(reference.height * pane / reference.width)), Image.Resampling.LANCZOS)
    b = implementation.resize((pane, round(implementation.height * pane / implementation.width)), Image.Resampling.LANCZOS)
    width, height = 2 * pane + gap + 2 * margin, header + max(a.height, b.height) + footer
    result = Image.new('RGB', (width, height), '#030d17')
    draw = ImageDraw.Draw(result)
    draw.text((margin, 16), f'COACH CORE / {kind.upper()} VISUAL REVIEW', font=font(23, True), fill='#f3f7fc')
    draw.text((margin, 50), 'REFERENCE · supplied interface crop', font=font(16, True), fill='#bac9d8')
    draw.text((margin + pane + gap, 50), 'IMPLEMENTATION · awaiting Coach Drew approval', font=font(16, True), fill='#bac9d8')
    note = 'No separate tablet reference supplied; desktop reference shown for adaptation review.' if kind == 'tablet' else 'Original raster enlarged for comparison; hardware frames excluded.'
    draw.text((margin, 78), note, font=font(13), fill='#91a6ba')
    result.paste(a, (margin, header))
    result.paste(b, (margin + pane + gap, header))
    for x, image in [(margin, a), (margin + pane + gap, b)]:
        draw.rectangle((x - 1, header - 1, x + image.width, header + image.height), outline='#233a4c', width=1)
    y = height - footer + 20
    for line in textwrap.wrap(caption, width=145 if kind != 'phone' else 83):
        draw.text((margin, y), line, font=font(16), fill='#bac9d8'); y += 24
    result.save(out / f'{kind}-reference-vs-implementation.png')

board('desktop', desktop, 'desktop-1440x1000.png', 'Intentional differences: readable controls and current relative sample dates; selected practice detail below the full-width calendar as requested. Saved plans without a start time remain untimed. Only existing modules are navigation destinations; scheduling and assignments remain unavailable outside labeled preview.')
board('tablet', desktop, 'tablet-834x1112.png', 'Intentional adaptation: compact icon sidebar, full-width weekly calendar and stacked practice detail. This is derived from the supplied desktop interface, not a claim that a tablet design was supplied. No device frame, stadium photography, unsupported modules or invented saved-plan information.')
board('phone', phone, 'phone-375x812.png', 'Intentional differences: plain deep navy instead of a stadium header; compact sample label; no unavailable attendance action. The primary sample action opens read-only preview details. Real plans use the existing Practice Plans workflow. Four working destinations remain in bottom navigation.')
print('Reference/implementation comparison boards created.')
