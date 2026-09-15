/** No model download is allowed while a customer file is being processed. */
export const dockerfile = `FROM python:3.12.11-slim-bookworm
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api
RUN apt-get update && apt-get install -y --no-install-recommends bash ca-certificates ffmpeg coreutils poppler-utils antiword tesseract-ocr tesseract-ocr-eng tesseract-ocr-swe && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir faster-whisper==1.2.1 Pillow==12.3.0
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-base', revision='ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66', local_dir='/opt/jori-speech', allow_patterns=['config.json','model.bin','tokenizer.json','vocabulary.txt'])"
RUN useradd -m -u 10001 user && mkdir -p /home/user/workspace && chown -R user:user /home/user
ENV OMP_THREAD_LIMIT=2 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 BL_SANDBOX_USER_ENABLED=true
WORKDIR /home/user/workspace
USER user
ENTRYPOINT ["/usr/local/bin/sandbox-api"]
`
