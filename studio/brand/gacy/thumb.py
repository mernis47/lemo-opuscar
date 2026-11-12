from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import sys, os
F='/usr/share/fonts/opentype/inter/Inter-Black.otf'
if not os.path.exists(F): F='/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
def make(out, lines, tag):
    im=Image.open('base.jpg').convert('RGB').resize((1280,720),Image.LANCZOS)
    im=ImageEnhance.Contrast(im).enhance(1.15); im=ImageEnhance.Color(im).enhance(1.25)
    W,H=im.size; x0=640
    layer=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer)
    # measure
    y=150
    items=[]
    for txt,size,col in lines:
        f=ImageFont.truetype(F,size)
        # shrink to fit
        while d.textlength(txt,font=f)>W-x0-40: size-=4; f=ImageFont.truetype(F,size)
        items.append((txt,f,col,size))
    total=sum(s*1.08 for *_,s in items); y=(H-total)/2-20
    glow=Image.new('RGBA',(W,H),(0,0,0,0)); g=ImageDraw.Draw(glow)
    pos=[]
    for txt,f,col,s in items:
        pos.append((txt,f,col,y)); 
        if col!=(255,255,255): g.text((x0,y),txt,font=f,fill=col+(255,))
        y+=s*1.08
    glow=glow.filter(ImageFilter.GaussianBlur(18))
    im=Image.alpha_composite(im.convert('RGBA'),glow)
    d=ImageDraw.Draw(im)
    yend=y
    for txt,f,col,yy in pos:
        d.text((x0,yy),txt,font=f,fill=col,stroke_width=6,stroke_fill=(0,0,0))
    # tag pill
    tf=ImageFont.truetype(F,30); tw=d.textlength(tag,font=tf)
    d.rounded_rectangle((x0-4,yend+14,x0+tw+28,yend+64),radius=8,fill=(200,20,20))
    d.text((x0+12,yend+20),tag,font=tf,fill=(255,255,255))
    im.convert('RGB').save(out,quality=92)
R=(255,40,40)
make('kapak_a.jpg',[("WER",150,(255,255,255)),("STECKT",150,(255,255,255)),("DAHINTER?",130,R)],"WAHRE GESCHICHTE · 1978")
make('kapak_b.jpg',[("WAS LAG",130,(255,255,255)),("UNTER",130,(255,255,255)),("SEINEM HAUS?",110,R)],"33 OPFER · CHICAGO")
make('kapak_c.jpg',[("WARUM",140,(255,255,255)),("MERKTE ES",120,(255,255,255)),("NIEMAND?",150,R)],"DER KILLER-CLOWN")
