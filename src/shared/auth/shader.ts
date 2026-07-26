const vertexSource = `
  attribute vec2 position;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentSource = `
  precision highp float;

  uniform vec2 resolution;
  uniform vec2 pointer;
  uniform float time;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  mat2 rotate(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
  }

  float streamline(vec2 point, float lane, float phase) {
    float focus = exp(-pow((point.x - 0.06) * 4.8, 2.0));
    float wave = sin(point.x * 2.4 + phase + lane * 4.8) * 0.042;
    wave += sin(point.x * 5.2 - phase * 0.56 - lane * 3.1) * 0.012;
    float center = lane + wave;
    center *= mix(1.0, 0.52, focus);
    center += sin(phase * 0.72 + lane * 5.0) * focus * 0.026;

    float distanceToLine = abs(point.y - center);
    float antialias = 0.95 / min(resolution.x, resolution.y);
    return 1.0 - smoothstep(0.00035, 0.00035 + antialias, distanceToLine);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float aspect = resolution.x / resolution.y;
    vec2 point = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
    vec2 pointerOffset = (pointer - 0.5) * vec2(0.040, 0.024);
    float phase = time * 0.20;
    float lines = 0.0;
    float anchorLines = 0.0;

    point = rotate(-0.12) * (point - pointerOffset);
    point.y -= 0.17;

    for (int index = 0; index < 16; index++) {
      float lane = (float(index) - 5.5) * 0.056;
      float line = streamline(point, lane, phase);
      lines = max(lines, line);

      if (index == 2 || index == 7 || index == 12) {
        anchorLines = max(anchorLines, line);
      }
    }

    vec3 paper = vec3(0.918, 0.936, 0.895);
    vec3 sage = vec3(0.395, 0.490, 0.401);
    vec3 deepSage = vec3(0.255, 0.340, 0.280);
    vec3 color = paper;
    color = mix(color, sage, lines * 0.32);
    color = mix(color, deepSage, anchorLines * 0.16);

    float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.007;
    gl_FragColor = vec4(color + grain, 1.0);
  }
`

type ShaderRenderer = {
  destroy(): void
  draw(pointer: ShaderPointer, time: number): void
  resize(): void
}

type ShaderPointer = {
  x: number
  y: number
}

type PointerTracker = {
  current: ShaderPointer
  destroy(): void
  update(): void
}

export function mountShader(canvas: HTMLCanvasElement) {
  const renderer = createRenderer(canvas)

  if (!renderer) {
    return
  }

  return runRenderer(canvas, renderer)
}

function createRenderer(canvas: HTMLCanvasElement): ShaderRenderer | undefined {
  const context = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  })

  if (!context) {
    return
  }

  try {
    return buildRenderer(canvas, context)
  } catch (error) {
    console.warn("Jori sign-in shader could not start.", error)
    return
  }
}

function buildRenderer(
  canvas: HTMLCanvasElement,
  context: WebGLRenderingContext
): ShaderRenderer {
  const program = createProgram(context)
  const buffer = context.createBuffer()

  if (!buffer) {
    throw new Error("Could not create the shader vertex buffer.")
  }

  context.bindBuffer(context.ARRAY_BUFFER, buffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    context.STATIC_DRAW
  )
  const activateProgram = context.useProgram.bind(context)
  activateProgram(program)

  const position = context.getAttribLocation(program, "position")
  const pointer = context.getUniformLocation(program, "pointer")
  const resolution = context.getUniformLocation(program, "resolution")
  const time = context.getUniformLocation(program, "time")

  context.enableVertexAttribArray(position)
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)

  return {
    destroy() {
      context.deleteBuffer(buffer)
      context.deleteProgram(program)
    },
    draw(currentPointer, elapsedTime) {
      context.uniform2f(resolution, canvas.width, canvas.height)
      context.uniform2f(pointer, currentPointer.x, currentPointer.y)
      context.uniform1f(time, elapsedTime)
      context.drawArrays(context.TRIANGLES, 0, 6)
    },
    resize() {
      resizeCanvas(canvas, context)
    },
  }
}

function runRenderer(
  canvas: HTMLCanvasElement,
  renderer: ShaderRenderer
): () => void {
  const frameDuration = 1000 / 30
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const pointerTracker = createPointerTracker(canvas, reducedMotion)
  let animationFrame = 0
  let isVisible = true
  let lastRenderedAt = 0
  const startedAt = performance.now()

  const draw = (now: number) => {
    if (lastRenderedAt === 0 || now - lastRenderedAt >= frameDuration) {
      pointerTracker.update()
      renderer.draw(
        pointerTracker.current,
        reducedMotion.matches ? 0 : (now - startedAt) / 1000
      )
      lastRenderedAt = now
    }

    if (isVisible && !reducedMotion.matches) {
      animationFrame = requestAnimationFrame(draw)
    }
  }
  const restart = () => {
    cancelAnimationFrame(animationFrame)
    lastRenderedAt = 0
    draw(performance.now())
  }
  const observer = new IntersectionObserver(([entry]) => {
    isVisible = entry?.isIntersecting ?? false
    restart()
  })
  const resizeObserver = new ResizeObserver(() => {
    renderer.resize()
    restart()
  })

  renderer.resize()
  observer.observe(canvas)
  resizeObserver.observe(canvas)
  reducedMotion.addEventListener("change", restart)
  restart()

  return () => {
    cancelAnimationFrame(animationFrame)
    observer.disconnect()
    resizeObserver.disconnect()
    reducedMotion.removeEventListener("change", restart)
    pointerTracker.destroy()
    renderer.destroy()
  }
}

function createPointerTracker(
  canvas: HTMLCanvasElement,
  reducedMotion: MediaQueryList
): PointerTracker {
  const current = { x: 0.5, y: 0.5 }
  const target = { x: 0.5, y: 0.5 }
  const handlePointerMove = (event: PointerEvent) => {
    if (reducedMotion.matches) {
      return
    }

    const bounds = canvas.getBoundingClientRect()
    target.x = (event.clientX - bounds.left) / bounds.width
    target.y = 1 - (event.clientY - bounds.top) / bounds.height
  }
  const handlePointerLeave = () => {
    target.x = 0.5
    target.y = 0.5
  }

  canvas.addEventListener("pointermove", handlePointerMove, { passive: true })
  canvas.addEventListener("pointerleave", handlePointerLeave)

  return {
    current,
    destroy() {
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("pointerleave", handlePointerLeave)
    },
    update() {
      current.x += (target.x - current.x) * 0.065
      current.y += (target.y - current.y) * 0.065
    },
  }
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: WebGLRenderingContext
) {
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5)
  const width = Math.round(canvas.clientWidth * pixelRatio)
  const height = Math.round(canvas.clientHeight * pixelRatio)

  if (canvas.width === width && canvas.height === height) {
    return
  }

  canvas.width = width
  canvas.height = height
  context.viewport(0, 0, width, height)
}

function createProgram(context: WebGLRenderingContext) {
  const program = context.createProgram()

  if (!program) {
    throw new Error("Could not create the shader program.")
  }

  const vertexShader = compileShader(
    context,
    context.VERTEX_SHADER,
    vertexSource
  )
  const fragmentShader = compileShader(
    context,
    context.FRAGMENT_SHADER,
    fragmentSource
  )

  context.attachShader(program, vertexShader)
  context.attachShader(program, fragmentShader)
  context.linkProgram(program)
  context.deleteShader(vertexShader)
  context.deleteShader(fragmentShader)

  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    throw new Error(
      context.getProgramInfoLog(program) ?? "Could not link the shader."
    )
  }

  return program
}

function compileShader(
  context: WebGLRenderingContext,
  kind: number,
  source: string
) {
  const shader = context.createShader(kind)

  if (!shader) {
    throw new Error("Could not create a shader.")
  }

  context.shaderSource(shader, source)
  context.compileShader(shader)

  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    throw new Error(
      context.getShaderInfoLog(shader) ?? "Could not compile a shader."
    )
  }

  return shader
}
