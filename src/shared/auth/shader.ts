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

  float grain(vec2 point) {
    return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float fold(float distance, float center, float width) {
    float normalized = (distance - center) / width;
    return exp(-normalized * normalized);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 waveDirection = vec2(-0.242, 0.970);
    vec2 waveOrigin = vec2(0.717, 0.810);
    float wavePhase = dot(uv - waveOrigin, waveDirection) * 4.398;
    float primaryWave = sin(wavePhase - time * 0.8);
    float secondaryWave = sin(wavePhase * 1.85 + time * 0.52);
    float vertical = 1.0 - uv.y;
    vec2 pointerOffset = (pointer - 0.5) * 0.20;
    float curve = 0.40 + 0.25 * pow(vertical, 1.45);
    curve += primaryWave * 0.075 + secondaryWave * 0.018;
    curve += pointerOffset.x * 0.55;
    curve += pointerOffset.y * (vertical - 0.5) * 0.30;

    float distanceToCurve = uv.x - curve;
    float diagonal = clamp(uv.x * 0.72 + uv.y * 0.54, 0.0, 1.0);
    vec2 focalPoint = vec2(0.097, 0.10) + pointerOffset;
    float lowerLeftLight = 1.0 - smoothstep(
      0.12,
      1.05,
      distance(uv, focalPoint)
    );

    vec3 lightSage = vec3(0.925, 0.945, 0.895);
    vec3 middleSage = vec3(0.655, 0.728, 0.630);
    vec3 deepSage = vec3(0.280, 0.390, 0.315);
    vec3 color = mix(lightSage, middleSage, diagonal * 0.72);
    color = mix(color, lightSage, lowerLeftLight * 0.36);

    float ribbon = smoothstep(-0.025, 0.14, distanceToCurve);
    vec3 ribbonColor = mix(middleSage, deepSage, 0.40 + diagonal * 0.42);
    color = mix(color, ribbonColor, ribbon * 0.43);

    float edgeShadow = fold(distanceToCurve, 0.010, 0.030);
    float firstShadow = fold(distanceToCurve, 0.062, 0.023);
    float secondShadow = fold(distanceToCurve, 0.112, 0.029);
    float thirdShadow = fold(distanceToCurve, 0.175, 0.043);
    float innerLight = fold(distanceToCurve, 0.037, 0.017);
    float secondLight = fold(distanceToCurve, 0.087, 0.018);

    color = mix(color, deepSage, edgeShadow * 0.20);
    color = mix(color, deepSage, firstShadow * 0.15);
    color = mix(color, deepSage, secondShadow * 0.11);
    color = mix(color, deepSage, thirdShadow * 0.065);
    color = mix(color, lightSage, innerLight * 0.10);
    color = mix(color, lightSage, secondLight * 0.065);

    float texture = (grain(gl_FragCoord.xy) - 0.5) * 0.018;
    gl_FragColor = vec4(color + texture, 1.0);
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
