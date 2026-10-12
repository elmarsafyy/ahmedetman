import wave, json, sys
from pocketsphinx import Decoder
words=open('audio/words.txt').read().split()
d=Decoder(loglevel="ERROR")
d.add_word("quintillion","K W IH N T IH L Y AH N",True)
d.set_align_text(" ".join(words))
with wave.open('audio/vo16k.wav','rb') as f:
    data=f.readframes(f.getnframes())
d.start_utt(); d.process_raw(data,full_utt=True); d.end_utt()
d.set_alignment()
d.start_utt(); d.process_raw(data,full_utt=True); d.end_utt()
out=[]
for s in d.seg():
    out.append([s.word, s.start_frame/100, s.end_frame/100])
json.dump(out,open('audio/align.json','w'))
ws=[o for o in out if o[0] not in ('<sil>','<s>','</s>','(NULL)')]
print(len(ws), len(words))
