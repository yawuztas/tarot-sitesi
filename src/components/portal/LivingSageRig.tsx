'use client';

import React, { useEffect, useRef, useState } from 'react';

interface LivingSageRigProps {
  isPointing: boolean;
  isHovering: boolean;
  staffGlowing: boolean;
  mousePos: { x: number; y: number };
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

export default function LivingSageRig({
  isPointing,
  isHovering,
  staffGlowing,
  mousePos,
  onClick,
  onHoverStart,
  onHoverEnd,
}: LivingSageRigProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      });
    } catch {
      Promise.resolve().then(() => setWebglSupported(false));
      return;
    }

    if (!gl) {
      Promise.resolve().then(() => setWebglSupported(false));
      return;
    }

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // GPU Tabanlı Gerçek Zamanlı Saydamlaştırma (Luma Key):
    // Siyah arka plan (lum < 0.02) %100 saydam (alpha = 0) kalır.
    // Bilgenin cüppesi ve tüm vücudu (lum >= 0.06) %100 tam OPAK hale gelir, içinden ışık geçmez.
    const fsSource = `
      precision mediump float;
      uniform sampler2D u_video;
      varying vec2 v_texCoord;
      void main() {
        vec4 color = texture2D(u_video, v_texCoord);
        float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float alpha = smoothstep(0.018, 0.065, lum);
        alpha = clamp(alpha * 1.25, 0.0, 1.0);
        gl_FragColor = vec4(color.rgb * alpha, alpha);
      }
    `;

    const compileShader = (type: number, source: string) => {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    // Quad Geometrisi (2 üçgen)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Doku Koordinatları (Video ekseni)
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        0.0, 0.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0,
      ]),
      gl.STATIC_DRAW
    );

    const aTexCoord = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // WebGL Dokusu
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // 1x1 piksel boş doku başlangıcı
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let animationFrameId: number;

    const render = () => {
      if (video.readyState >= 2 && gl) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    video.play().catch(() => {});
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);
        gl.deleteTexture(texture);
      }
    };
  }, []);

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="relative cursor-pointer group select-none h-[48vh] sm:h-[56vh] md:h-[65vh] lg:h-[72vh] aspect-[9/16]"
    >
      {/* Gizli Video Akışı (WebGL GPU için kaynak) */}
      <video
        ref={videoRef}
        poster="/assets/ancient_sage.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="hidden"
      >
        <source src="/assets/ancient_sage.webm" type="video/webm" />
        <source src="/assets/ancient_sage.mp4" type="video/mp4" />
      </video>

      {/* GPU Tabanlı Gerçek Şeffaf Bilge Kanvası - Siyah Alanlar %100 Boş / Saydamdır */}
      {webglSupported ? (
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          className="w-full h-full object-contain object-bottom pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
        />
      ) : (
        <video
          poster="/assets/ancient_sage.jpg"
          autoPlay
          loop
          muted
          playsInline
          style={{ mixBlendMode: 'screen' }}
          className="w-full h-full object-contain object-bottom pointer-events-none mix-blend-screen"
        >
          <source src="/assets/ancient_sage.webm" type="video/webm" />
          <source src="/assets/ancient_sage.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
