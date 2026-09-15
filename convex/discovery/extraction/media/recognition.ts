/** Runs only inside a fresh regional sandbox; each native parser subprocess exits. */
export const recognitionScript = String.raw`
import json, os, re, resource, subprocess, sys, time, warnings
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path('/home/user/workspace')
os.chdir(ROOT)
DEADLINE = time.monotonic() + 120
MAX_TEXT = 2_000_000
Image.MAX_IMAGE_PIXELS = 16_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
output = open('recognition.json', 'w', encoding='utf-8')
output.write('{"partial":true}\n')
output.flush()
length = 0

class Limit(Exception):
    pass

def limits():
    resource.setrlimit(resource.RLIMIT_AS, (2_147_483_648, 2_147_483_648))
    resource.setrlimit(resource.RLIMIT_FSIZE, (32_000_000, 32_000_000))
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))

def run(args, destination='command.txt'):
    remaining = DEADLINE - time.monotonic()
    if remaining <= 0:
        raise Limit()
    with open(destination, 'wb') as target:
        subprocess.run(args, stdout=target, stderr=subprocess.DEVNULL,
                       timeout=min(30, remaining), check=True, preexec_fn=limits)
    if Path(destination).stat().st_size > 12_000_000:
        raise Limit()
    return Path(destination).read_text(encoding='utf-8', errors='strict')

def emit(section):
    global length
    length += len(section['text'])
    if length > MAX_TEXT:
        raise Limit()
    output.write(json.dumps(section, ensure_ascii=False) + '\n')
    output.flush()

def recognize(path):
    return run(['tesseract', str(path), 'stdout', '-l', 'eng+swe', '--dpi', '150']).strip()

def picture():
    with Image.open('input') as image:
        if image.width * image.height > 16_000_000:
            raise Limit()
        if getattr(image, 'n_frames', 1) != 1:
            raise ValueError('frames')
        image = ImageOps.exif_transpose(image)
        image.thumbnail((2000, 2000))
        background = Image.new('RGB', image.size, 'white')
        rgba = image.convert('RGBA')
        background.paste(rgba, mask=rgba.getchannel('A'))
        background.save('page.png')
    emit({'text': recognize('page.png'), 'ocr': True})

def document():
    information = run(['pdfinfo', 'input'])
    if re.search(r'^Encrypted:\s+yes', information, re.M):
        raise ValueError('encrypted')
    count = re.search(r'^Pages:\s+(\d+)', information, re.M)
    if count is None:
        raise ValueError('invalid')
    pages = int(count.group(1))
    if pages > 1000:
        raise Limit()
    selected = json.loads(Path('pages.json').read_text())
    recognized = 0
    for page in selected:
        section = {'text': '', 'page': page}
        if True:
            try:
                if recognized >= 20:
                    raise Limit()
                recognized += 1
                run(['pdftoppm', '-f', str(page), '-l', str(page), '-singlefile',
                     '-scale-to', '2000', '-png', 'input', 'page'])
                section['text'] = '\n'.join(filter(None, [section['text'], recognize('page.png')]))
                section['ocr'] = True
            except Exception:
                section['unavailable'] = True
            finally:
                Path('page.png').unlink(missing_ok=True)
        emit(section)

try:
    if sys.argv[1] == 'doc':
        emit({'text': run(['antiword', '-m', 'UTF-8.txt', 'input'])})
    elif sys.argv[1] == 'pdf':
        document()
    else:
        picture()
    output.write('{"complete":true}\n')
except (Limit, Image.DecompressionBombError, Image.DecompressionBombWarning):
    output.write('{"error":"limit"}\n')
except Exception as error:
    reason = str(error) if isinstance(error, ValueError) and str(error) in ('frames', 'encrypted') else 'failed'
    output.write(json.dumps({'error': reason}) + '\n')
finally:
    output.close()
`
