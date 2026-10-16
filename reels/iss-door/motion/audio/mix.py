import numpy as np, wave
from scipy.signal import butter, sosfilt
SR=48000; DUR=91.2; N=int(SR*DUR); t=np.arange(N)/SR
rng=np.random.default_rng(13)
def rd(p): w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
voice=np.zeros(N); v=rd('door/voice48.wav'); voice[:min(N,len(v))]=v[:N]
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x)
def bp(x,a,b,o=2): return sosfilt(butter(o,[a,b],'band',fs=SR,output='sos'),x)
def env(pts): ts,vs=zip(*pts); return np.interp(t,ts,vs)
def tone(f,det=0.25,harm=(1,0.3,0.1)):
    out=np.zeros(N)
    for d in (-det,0,det):
        ph=2*np.pi*(f+d)*t+0.3*np.sin(2*np.pi*0.05*t+f)
        for k,a in enumerate(harm): out+=a*np.sin((k+1)*ph)
    return out/3
# beds
cabin=env([(0,0.6),(3.6,0.6),(3.65,0),(5.85,0),(6.0,0.7),(20.3,0.7),(20.4,0.8),(24.7,0.8),(24.8,0),(73.6,0),(74.5,0.5),(77.9,0.6),(91.2,0.6)])
fan=bp(rng.standard_normal(N),120,1800)*0.5+lp(rng.standard_normal(N),180)*0.6+0.04*np.sin(2*np.pi*60*t)
fan*=cabin
drone_e=env([(0,0.4),(3.6,0.5),(5.8,0.8),(6,0.25),(20.3,0.35),(24.6,0.9),(33,0.6),(35.5,0),(38.4,0),(38.6,0.4),(50.1,0.4),(50.3,0),(58.9,0),(59.2,0.3),(63.6,0),(63.9,0.8),(73.5,0.7),(73.7,0.3),(86.3,0.3),(88.5,0.7),(91.2,0)])
drone=(tone(55)*0.8+tone(82.41)*0.5+tone(110)*0.35+tone(123.47)*0.2)*(0.8+0.2*np.sin(2*np.pi*t/8))
drone=lp(drone,900)*drone_e
music=fan*0.2+drone*0.1
# global silence after "the sound just fades away"
silence=env([(0,1),(34.3,1),(36.6,0.02),(38.3,0.02),(38.6,1),(63.0,1),(63.7,0.1),(63.9,1),(91.2,1)])
sfx=np.zeros(N)
def place(sig,at,g=1.0):
    i=int(at*SR); j=min(N,i+len(sig))
    if 0<=i<N: sfx[i:j]+=sig[:j-i]*g
def boom(dur=3.0,f0=90,f1=28,noise=0.5,bright=1500):
    n=int(dur*SR); tt=np.arange(n)/SR; f=f1+(f0-f1)*np.exp(-tt*3)
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*1.6)+lp(rng.standard_normal(n),bright)*np.exp(-tt*4)*noise)*np.minimum(1,tt/0.004)
def clunk(dur=0.5): n=int(dur*SR); tt=np.arange(n)/SR; return (bp(rng.standard_normal(n),200,2500)*np.exp(-tt*25)*1.5+np.sin(2*np.pi*140*tt)*np.exp(-tt*18))
def beep(f=1760,dur=0.09): n=int(dur*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.minimum(1,tt/0.003)*np.minimum(1,(dur-tt)/0.01)
def tick(f=2600,dur=0.025): n=int(dur*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.exp(-tt*200)
def chime(f=1174.7,dur=2.5): n=int(dur*SR); tt=np.arange(n)/SR; return (np.sin(2*np.pi*f*tt)+0.4*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt*2.2)*np.minimum(1,tt/0.005)
def noise_env(dur,lo,hi,shape): n=int(dur*SR); return bp(rng.standard_normal(n),lo,hi)*shape(np.arange(n)/SR)
# hook: two-tone alarm + handle clunks
for k in range(9): place(beep(880 if k%2 else 660,0.22),0.1+k*0.4,0.06)
place(clunk(),0.7,0.25); place(clunk(),2.4,0.3)
place(noise_env(2.2,200,3000,lambda x:np.sin(np.pi*x/2.2)**2),3.6,0.25)   # stepping out whoosh
place(boom(3,60,30,0.2,400),7.24,0.25)
for i in range(18): place(tick(1500+i*40),15.7+i*0.1,0.04)
place(boom(2,55,30,0.1,300),18.3,0.3)
# airlock tension + failure
place(noise_env(4.0,80,600,lambda x:(x/4.0)**2),20.4,0.25)
for k in range(5): place(beep(990,0.12),23.5+k*0.25,0.07)
place(noise_env(1.2,1500,6000,lambda x:np.exp(-x*2)),23.55,0.12)       # metal creak/hiss
# decompression: boom + roaring wind decaying, debris thumps
place(boom(5,120,24,1.0,3000),24.72,0.55)
place(noise_env(10,60,2500,lambda x:np.minimum(1,x/0.08)*np.exp(-x*0.28)),24.72,0.3)
for i in range(10): place(clunk(0.3),24.9+i*0.32,0.1)
place(noise_env(3.5,3000,9000,lambda x:np.sin(np.pi*x/3.5)),29.3,0.06)  # fog hiss
# silence: faint tinnitus
place(np.sin(2*np.pi*4200*np.arange(int(2.0*SR))/SR)*np.sin(np.pi*np.arange(int(2.0*SR))/SR/2.0),36.4,0.006)
# lungs
place(noise_env(1.0,300,3000,lambda x:np.sin(np.pi*x)**2),40.9,0.12)    # exhale
for k in range(4): place(beep(1320,0.1),43.2+k*0.3,0.06)
# boiling
bub=np.zeros(int(2.2*SR)); r2=np.random.default_rng(3)
for k in range(140):
    i=int(r2.random()*(len(bub)-3000)); n=600+int(r2.random()*2000); tt=np.arange(n)/SR; bub[i:i+n]+=np.sin(2*np.pi*(600+r2.random()*1800)*tt*(1+tt*8))*np.exp(-tt*60)
place(bub,48.1,0.12)
# 1966: projector flicker + pump hiss + gauge ticks
proj=bp(rng.standard_normal(int(8.6*SR)),800,5000)*(0.5+0.5*(np.sin(2*np.pi*24*np.arange(int(8.6*SR))/SR)>0.7))
place(proj,50.25,0.03)
place(noise_env(1.3,200,4000,lambda x:np.sin(np.pi*x/1.3)),52.4,0.12)
# heartbeat slowing + countdown ticks
for i,at in enumerate([59.0,59.8,60.65,61.55,62.5]):
    g=0.35*(1-i*0.12); place(boom(0.35,70,45,0.1,200),at,g); place(boom(0.3,65,40,0.1,200),at+0.22,g*0.7)
for i in range(15): place(tick(1100),61.2+i*(2.3/15),0.04)
# thermos
place(chime(880,2.5),68.5,0.04); place(chime(330,3.0),71.9,0.05)
# rescue: air flowing back in + hatch clunk + chime
place(noise_env(2.2,150,4000,lambda x:np.minimum(1,x/0.2)*np.exp(-x*0.8)),73.9,0.35); place(clunk(),75.3,0.35); place(chime(1046.5,2.0),76.5,0.05)
# leak whistle
place(np.sin(2*np.pi*6800*np.arange(int(4*SR))/SR)*np.sin(np.pi*np.arange(int(4*SR))/SR/4),82.4,0.004)
# closing: handle locks
place(clunk(),86.6,0.3); place(clunk(),88.2,0.4); place(beep(1568,0.15),88.3,0.06); place(boom(3,60,28,0.2,400),88.95,0.3)
sfx=lp(sfx,11000)
ve=lp(np.abs(voice),6,1); ve/=ve.max(); duck=1-np.clip(ve*4,0,1)*0.4
sduck=1-np.clip(ve*4,0,1)*0.5
mix=voice+(music*duck*0.5+sfx*0.6*sduck)*silence
mix*=np.clip((DUR-t)/0.9,0,1); mix=mix/np.abs(mix).max()*0.89
w=wave.open('door/mix.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close()
def rms(x,a,b): s=x[int(a*SR):int(b*SR)]; return 20*np.log10(np.sqrt((s**2).mean())+1e-9)
for a,b in [(0,3.6),(8,14),(24.7,28),(36.7,38.3),(50,58),(64,72),(86,90)]:
    print(f"{a}-{b}: voice {rms(voice,a,b):.1f} bed {rms(music*duck*0.5*silence,a,b):.1f} sfx {rms(sfx*0.6*silence,a,b):.1f}")
