from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps
import os
F='/usr/share/fonts/opentype/inter/Inter-Black.otf'
if not os.path.exists(F): F='/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
R=(235,35,35)
def make(out, src, mirror, lines, tag, x0=50, wmax=640):
    im=Image.open(src).convert('RGB')
    if mirror: im=ImageOps.mirror(im)
    w,h=im.size; s=max(1280/w,720/h); im=im.resize((int(w*s)+1,int(h*s)+1),Image.LANCZOS)
    x=(im.width-1280)//2; y=(im.height-720)//2; im=im.crop((x,y,x+1280,y+720))
    im=ImageEnhance.Contrast(im).enhance(1.2); im=ImageEnhance.Color(im).enhance(1.15)
    # darken text side
    grad=Image.new('L',(1280,720)); gd=ImageDraw.Draw(grad)
    for i in range(1280):
        v=int(210*max(0,1-abs(i-(x0+wmax/2))/(wmax*0.85))); gd.line([(i,0),(i,720)],fill=v)
    im=Image.composite(Image.new('RGB',(1280,720),(0,0,0)),im,grad)
    d=ImageDraw.Draw(im); items=[]
    for txt,size,col in lines:
        f=ImageFont.truetype(F,size)
        while d.textlength(txt,font=f)>wmax: size-=4; f=ImageFont.truetype(F,size)
        items.append((txt,f,col,size))
    total=sum(sz*1.06 for *_,sz in items); yy=(720-total)/2-30
    glow=Image.new('RGBA',(1280,720),(0,0,0,0)); g=ImageDraw.Draw(glow); pos=[]
    for txt,f,col,sz in items:
        pos.append((txt,f,col,yy))
        if col!=(255,255,255): g.text((x0,yy),txt,font=f,fill=col+(255,))
        yy+=sz*1.06
    im=Image.alpha_composite(im.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(16))); d=ImageDraw.Draw(im)
    for txt,f,col,y1 in pos: d.text((x0,y1),txt,font=f,fill=col,stroke_width=6,stroke_fill=(0,0,0))
    tf=ImageFont.truetype(F,30); tw=d.textlength(tag,font=tf)
    d.rounded_rectangle((x0-4,yy+16,x0+tw+28,yy+66),radius=8,fill=(200,20,20)); d.text((x0+12,yy+22),tag,font=tf,fill=(255,255,255))
    im.convert('RGB').save(out,quality=92)
B='../../episodes/bach_de/img/'
make('kapak_a.jpg',B+'B69.jpg',True,[("HÄTTEST DU",120,(255,255,255)),("ES AUCH",120,(255,255,255)),("GETAN?",170,R)],"WAHRE GESCHICHTE · 1981")
make('kapak_b.jpg',B+'B04.jpg',False,[("8 SCHÜSSE",130,R),("IM",110,(255,255,255)),("GERICHTSSAAL",110,(255,255,255))],"EINE MUTTER RICHTET SELBST",x0=40,wmax=560)
