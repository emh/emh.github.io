const canvas = document.getElementById('canvas');
const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
});

const vsSrc = `#version 300 es
    precision highp float;
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      // a_pos is a fullscreen triangle in clip space [-1,1]
      v_uv = a_pos * 0.5 + 0.5;     // map to [0,1]
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;

const fsSrc = `#version 300 es
    precision highp float;

    in vec2 v_uv;
    out vec4 outColor;

    uniform vec2  u_res;      // pixels
    uniform vec2  u_center;   // complex plane center (a,b)
    uniform float u_scale;    // complex plane width
    uniform int   u_maxIter;

    // 4x4 Bayer ordered dithering threshold in [0,1)
    float bayer4(vec2 p) {
        // p is pixel coordinates
        ivec2 i = ivec2(mod(p, 4.0));
        int x = i.x;
        int y = i.y;

        // Bayer 4x4 matrix values 0..15 (row-major)
        int idx = y * 4 + x;
        int m =
            (idx ==  0) ?  0 : (idx ==  1) ?  8 : (idx ==  2) ?  2 : (idx ==  3) ? 10 :
            (idx ==  4) ? 12 : (idx ==  5) ?  4 : (idx ==  6) ? 14 : (idx ==  7) ?  6 :
            (idx ==  8) ?  3 : (idx ==  9) ? 11 : (idx == 10) ?  1 : (idx == 11) ?  9 :
            (idx == 12) ? 15 : (idx == 13) ?  7 : (idx == 14) ? 13 :  5;

        return (float(m) + 0.5) / 16.0;
    }

    void main() {
      // Keep aspect ratio correct: scale is width; height derives from res
      float aspect = u_res.y / u_res.x;
      float viewW = u_scale;
      float viewH = u_scale * aspect;

      // Map fragment -> complex plane
      float a = u_center.x + (v_uv.x - 0.5) * viewW;
      float b = u_center.y + (v_uv.y - 0.5) * viewH;

      // Mandelbrot iteration: z_{n+1} = z^2 + c, z0=0
      float zr = 0.0, zi = 0.0;
      float it = 0.0;

      // We can't loop with a dynamic bound in some GLSL implementations cleanly,
      // so loop to a fixed cap and break.
      // NOTE: maxIter should be <= 500-ish for wide compatibility.
      const int HARD_CAP = 1200;
      for (int i = 0; i < HARD_CAP; i++) {
        if (i >= u_maxIter) break;

        float zr2 = zr*zr;
        float zi2 = zi*zi;

        if (zr2 + zi2 > 4.0) { it = float(i); break; }

        float two = 2.0*zr*zi;
        zr = zr2 - zi2 + a;
        zi = two + b;

        // If never escaped, we'll overwrite later
        it = float(i+1);
      }

      // Inside set (didn't escape)
      float mag2 = zr*zr + zi*zi;
      bool inside = (mag2 <= 4.0) && (it >= float(u_maxIter));

      if (inside) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // Smooth coloring: mu = n + 1 - log2(log|z|)
      // log|z| = 0.5*log(|z|^2)
      float log_zn = log(mag2) * 0.5;
      float nu = log(log_zn / log(2.0)) / log(2.0);
      float mu = it + 1.0 - nu;

      float t = mu / float(u_maxIter);

        float g = pow(clamp(t, 0.0, 1.0), 1.15);

        // Pixel coords for dithering
        vec2 pix = v_uv * u_res;

        // Ordered threshold
        float th = bayer4(pix);

        // Black/white output
        float bw = (g < th) ? 0.0 : 1.0;
        outColor = vec4(vec3(bw), 1.0);


    }`;

function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error(log || "Shader compile failed");
    }
    return sh;
}

function createProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(p);
        gl.deleteProgram(p);
        throw new Error(log || "Program link failed");
    }
    return p;
}

const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
const prog = createProgram(vs, fs);

// ---------- Fullscreen triangle ----------
// 3 vertices that cover the screen: (-1,-1), (3,-1), (-1,3)
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
        -1, -1,
        3, -1,
        -1, 3
    ]),
    gl.STATIC_DRAW
);

const locPos = gl.getAttribLocation(prog, "a_pos");
gl.enableVertexAttribArray(locPos);
gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

gl.bindVertexArray(null);

// ---------- Uniform locations ----------
const u_res = gl.getUniformLocation(prog, "u_res");
const u_center = gl.getUniformLocation(prog, "u_center");
const u_scale = gl.getUniformLocation(prog, "u_scale");
const u_maxIter = gl.getUniformLocation(prog, "u_maxIter");

let centerA = -0.5;
let centerB = 0.0;
let scale = 3.0;
let maxIter = 350;

let raf = null;
let simT = 0;
let lastTs = null;

const PATH = {
    baseCenter: { a: -0.743643887037151, b: 0.13182590420533 },
    spiralRadius: 0.12,
    spiralTurns: 0.15,     // radians per second
    wobbleRadius: 0.02,
    wobbleFreq: 0.6
};

const ZOOM = {
    min: 2e-4,   // deeper than this starts to get chunky
    max: 3.0,    // full view
    period: 40.0 // seconds for a full in+out cycle
};

const REF_SCALE = ZOOM.max; // reference for "normal" speed

function cameraAtTime(t) {
    // Exponential zoom
    const phase = (2 * Math.PI * t) / ZOOM.period;
    const s = 0.5 + 0.5 * Math.sin(phase); // 0..1
    const scale = ZOOM.min + s * (ZOOM.max - ZOOM.min);

    // Log spiral angle
    const ang = t * PATH.spiralTurns;

    // Spiral drift (normalized), then scale to keep screen speed stable
    const sa = Math.cos(ang) * PATH.spiralRadius * scale;
    const sb = Math.sin(ang) * PATH.spiralRadius * scale;

    // Wobble (normalized), then scale
    const wa = Math.sin(t * PATH.wobbleFreq) * PATH.wobbleRadius * scale;
    const wb = Math.cos(t * PATH.wobbleFreq * 0.7) * PATH.wobbleRadius * scale;

    const centerA = PATH.baseCenter.a + sa + wa;
    const centerB = PATH.baseCenter.b + sb + wb;

    return { centerA, centerB, scale };
}

const run = () => {
    const tick = (ts = 0) => {
        const width = canvas.width;
        const height = canvas.height;

        gl.viewport(0, 0, width, height);

        if (lastTs == null) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) * 0.001);
        lastTs = ts;

        // timeScale based on current zoom level (or the last frame's scale)
        const timeScale = Math.sqrt(scale / REF_SCALE);

        // advance a continuous simulation clock
        simT += dt * timeScale;

        // use simT as the time parameter everywhere
        const cam = cameraAtTime(simT);

        centerA = cam.centerA;
        centerB = cam.centerB;
        scale = cam.scale;

        const zoom = ZOOM.max / scale;
        maxIter = Math.min(1200, Math.floor(320 + 160 * Math.log2(zoom + 1)));

        gl.useProgram(prog);
        gl.bindVertexArray(vao);

        gl.uniform2f(u_res, width, height);
        gl.uniform2f(u_center, centerA, centerB);
        gl.uniform1f(u_scale, scale);
        gl.uniform1i(u_maxIter, maxIter);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        raf = requestAnimationFrame(tick);
    };

    if (raf) cancelAnimationFrame(raf);

    raf = requestAnimationFrame(tick);
};

const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    run();
};

window.addEventListener('resize', resize);

resize();
