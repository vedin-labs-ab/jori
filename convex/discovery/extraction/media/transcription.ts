/** Fixed paths and arguments keep filenames and source text out of commands and
 * provider process metadata. The image contains every dependency and model. */
export const transcriptionScript = `import json, subprocess, time
import numpy as np
from faster_whisper import WhisperModel

subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-threads','1','-max_alloc','33554432','-protocol_whitelist','file,pipe','-copyts','-start_at_zero','-i','input','-map','0:a:0','-vn','-af','aresample=async=1:first_pts=0','-t','1800.01','-ac','1','-ar','16000','-f','s16le','decoded.pcm'], check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
samples = np.fromfile('decoded.pcm', dtype=np.int16)
partial = len(samples) > 1800 * 16000
samples = samples[:1800 * 16000].astype(np.float32) / 32768.0
deadline = time.monotonic() + 360
with open('transcript.json','w') as output:
  output.write('{"partial":true}\\n')
  output.flush()
  model = WhisperModel('/opt/jori-speech', device='cpu', compute_type='int8', cpu_threads=2, local_files_only=True)
  segments, _ = model.transcribe(samples, beam_size=5, vad_filter=True, vad_parameters={'min_silence_duration_ms':500})
  for segment in segments:
    output.write(json.dumps({'text':segment.text.strip(), 'seconds':segment.start}) + '\\n')
    output.flush()
    if time.monotonic() >= deadline:
      partial = True
      break
  output.write('{"complete":false}\\n' if partial else '{"complete":true}\\n')
`
