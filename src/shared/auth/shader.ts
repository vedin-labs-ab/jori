const vertexSource = `
  attribute vec2 position;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentSource = `
  precision highp float;

  uniform vec2 resolution;
  uniform float time;

  float random(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    float bottom = mix(
      random(cell),
      random(cell + vec2(1.0, 0.0)),
      local.x
    );
    float top = mix(
      random(cell + vec2(0.0, 1.0)),
      random(cell + vec2(1.0, 1.0)),
      local.x
    );

    return mix(bottom, top, local.y);
  }

  float fieldNoise(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * noise(point);
      point = point * 2.03 + vec2(7.4, 3.8);
      amplitude *= 0.5;
    }

    return value;
  }

  float contour(float value, float count, float width) {
    float distanceToLine = abs(fract(value * count) - 0.5);
    return 1.0 - smoothstep(width, width + 0.012, distanceToLine);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 point = uv - 0.5;
    point.x *= resolution.x / resolution.y;

    float drift = time * 0.018;
    float broad = fieldNoise(
      point * 1.7 + vec2(drift, -drift * 0.7)
    );
    float detail = fieldNoise(
      point * 3.2 + vec2(broad * 0.45, drift * 0.55)
    );
    float surface = broad * 0.72 + detail * 0.28 + point.y * 0.12;
    float primaryLine = contour(surface, 8.0, 0.025);
    float fineLine = contour(surface + detail * 0.08, 15.0, 0.012);

    vec3 canvas = vec3(0.929, 0.945, 0.918);
    vec3 sage = vec3(0.318, 0.421, 0.345);
    float ink = clamp(primaryLine * 0.20 + fineLine * 0.055, 0.0, 0.24);

    gl_FragColor = vec4(mix(canvas, sage, ink), 1.0);
  }
`

type ShaderRenderer = {
  destroy(): void
  draw(time: number): void
  resize(): void
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
    console.warn("Milo sign-in shader could not start.", error)
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
  const resolution = context.getUniformLocation(program, "resolution")
  const time = context.getUniformLocation(program, "time")

  context.enableVertexAttribArray(position)
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)

  return {
    destroy() {
      context.deleteBuffer(buffer)
      context.deleteProgram(program)
    },
    draw(elapsedTime) {
      context.uniform2f(resolution, canvas.width, canvas.height)
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
  let animationFrame = 0
  let isVisible = true
  let lastRenderedAt = 0
  const startedAt = performance.now()

  const draw = (now: number) => {
    if (lastRenderedAt === 0 || now - lastRenderedAt >= frameDuration) {
      renderer.draw(reducedMotion.matches ? 0 : (now - startedAt) / 1000)
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
    renderer.destroy()
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
