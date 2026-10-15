from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out=Path(__file__).parent.parent/'outputs/narrow-review'
original=Image.open('C:/Users/drewl/Downloads/Coach Core AI feature overview.png').convert('RGB')
phone=original.crop((739,174,906,547));desktop=original.crop((155,169,706,552))
phone.save(out/'reference-phone-ui.png');desktop.save(out/'reference-desktop-ui.png')
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',19)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
for width in [375,430,490,834,1440]:
    ref=phone if width<768 else desktop
    implementation=Image.open(out/f'{width}-top.png').convert('RGB')
    leftwidth=width if width<768 else 700
    ref=ref.resize((leftwidth,round(ref.height*leftwidth/ref.width)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(leftwidth+implementation.width+72,max(ref.height,implementation.height)+126),'#030d17')
    d=ImageDraw.Draw(canvas)
    d.text((24,16),'APPROVED CONCEPT — interface crop',font=font,fill='#f3f7fc')
    d.text((leftwidth+48,16),f'IMPLEMENTATION — {width}px',font=font,fill='#f3f7fc')
    d.text((24,48),'Desktop concept adapted for tablet' if width==834 else 'Source pixels; decorative hardware excluded',font=small,fill='#bac9d8')
    d.text((leftwidth+48,48),'Actual Chromium viewport capture · sample data',font=small,fill='#bac9d8')
    canvas.paste(ref,(24,92));canvas.paste(implementation,(leftwidth+48,92))
    canvas.save(out/f'{width}-reference-vs-implementation.png')
    if width<768:
        canvas.paste(Image.open(out/f'{width}-bottom.png').convert('RGB'),(leftwidth+48,92))
        d.rectangle((leftwidth+48,12,canvas.width,42),fill='#030d17')
        d.text((leftwidth+48,16),f'SELECTED AGENDA — {width}px',font=font,fill='#f3f7fc')
        canvas.save(out/f'{width}-agenda-reference-vs-implementation.png')
