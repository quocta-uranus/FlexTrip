'use client';

import { Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const WIDTH = 600;
const HEIGHT = 200;
// Nét quá ngắn (chấm, gạch nhỏ) không được coi là chữ ký; BE cũng từ chối ảnh quá đơn giản.
const MIN_POINTS = 12;
const MIN_LENGTH = 120;

interface SignaturePadProps {
  /** Nhận ảnh PNG (data URL) khi đã ký đủ nét, hoặc null khi trống/đã xoá. */
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const stats = useRef({ points: 0, length: 0 });
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f1729';
  }, []);

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = position(e);
    last.current = p;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const p = position(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    stats.current.points += 1;
    stats.current.length += Math.hypot(p.x - last.current.x, p.y - last.current.y);
    last.current = p;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const ok = stats.current.points >= MIN_POINTS && stats.current.length >= MIN_LENGTH;
    setHasInk(ok);
    onChange(ok ? canvasRef.current!.toDataURL('image/png') : null);
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
    stats.current = { points: 0, length: 0 };
    setHasInk(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed ${hasInk ? 'border-[#2a7bd9]' : 'border-[#cbd5e1]'} bg-white`}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Ô ký tên: giữ chuột và vẽ chữ ký"
          className={`block w-full touch-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {!hasInk && !drawing.current && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#94a3b8]">
            Giữ chuột và vẽ chữ ký của bạn vào đây
          </p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-[#8694ad]">
        <span>Ký bằng chuột hoặc ngón tay.</span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="inline-flex items-center gap-1 font-medium text-[#2a7bd9] disabled:opacity-50"
        >
          <Eraser className="h-3.5 w-3.5" /> Xoá và ký lại
        </button>
      </div>
    </div>
  );
}
