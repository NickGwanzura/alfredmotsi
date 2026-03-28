'use client';

import React, { useState, useRef } from 'react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
}

export default function SignaturePad({ onSave }: SignaturePadProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  const pos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    const s = 'touches' in e ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ref.current) return;
    drawing.current = true;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;
    const p = pos(e, ref.current);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !ref.current) return;
    e.preventDefault();
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#161616";
    ctx.lineCap = "round";
    const p = pos(e, ref.current);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setSigned(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 500, 120);
    setSigned(false);
  };

  return (
    <div>
      <canvas 
        ref={ref} 
        className="sig-pad" 
        width={500} 
        height={120}
        onMouseDown={start} 
        onMouseMove={draw} 
        onMouseUp={end} 
        onMouseLeave={end}
        onTouchStart={start} 
        onTouchMove={draw} 
        onTouchEnd={end} 
      />
      <div style={{ display: "flex", gap: 0, marginTop: "var(--s3)" }}>
        <button className="btn btn-s btn-sm" onClick={clear}>Clear</button>
        {signed && (
          <button 
            className="btn btn-p btn-sm" 
            onClick={() => ref.current && onSave(ref.current.toDataURL())}
          >
            Confirm Customer Signature
          </button>
        )}
      </div>
    </div>
  );
}
