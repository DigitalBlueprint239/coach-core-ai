from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path(__file__).parent.parent/'outputs/composition-pass';reference=Image.open('C:/Users/drewl/Downloads/Coach Core AI feature overview.png').convert('RGB');font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
for name,native,width,crop in [('desktop',1440,900,(155,169,706,552)),('phone',375,375,(739,174,906,547))]:
    images=[reference.crop(crop),Image.open(out/f'{native}-dashboard.png').convert('RGB')]
    images=[im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS) for im in images]
    canvas=Image.new('RGB',(width*2+72,max(im.height for im in images)+110),'#030d17');d=ImageDraw.Draw(canvas)
    d.text((24,16),'APPROVED REFERENCE',font=font,fill='#f3f7fc');d.text((width+48,16),'UPDATED #67 · APPROVAL PENDING',font=font,fill='#f3f7fc')
    d.text((24,47),'Interface crop · equal display width',font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14),fill='#bac9d8');d.text((width+48,47),f'Actual {native}px capture · fixed sample week',font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14),fill='#bac9d8')
    for i,im in enumerate(images):canvas.paste(im,(24+i*(width+24),86))
    canvas.save(out/f'{name}-reference-vs-updated.png')
