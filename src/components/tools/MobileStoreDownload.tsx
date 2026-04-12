"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";

function isolateActionInteraction(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

function QrImage({
  url,
  alt,
  size,
}: {
  url: string;
  alt: string;
  size: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0e12ff", light: "#ffffffff" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (failed) {
    return (
      <p className="text-xs text-red-400/90 text-center px-2">
        Couldn&apos;t create a QR code. Use the button below to open the store instead.
      </p>
    );
  }
  if (!dataUrl) {
    return (
      <div
        className="bg-white/90 rounded-none animate-pulse border border-card-border mx-auto"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className="rounded-none bg-white p-2 border border-card-border mx-auto"
    />
  );
}

function StoreModal({
  href,
  linkLabel,
  qrDescription,
  trackActionOpen,
  qrSize,
  onClose,
  onTrack,
}: {
  href: string;
  linkLabel: string;
  qrDescription: string;
  trackActionOpen: string;
  qrSize: number;
  onClose: () => void;
  onTrack: (action: string) => void;
}) {
  const titleId = useId();
  const openLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    openLinkRef.current?.focus();
  }, []);

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onPointerDownCapture={isolateActionInteraction}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm border-2 border-emerald-500/35 bg-background/95 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] p-5 sm:p-6 rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-foreground text-center">
          Open {linkLabel}?
        </h2>
        <p className="text-sm text-foreground/55 text-center mt-2 leading-relaxed">
          Continue to the store on this device, or scan the code with another phone or tablet.
        </p>

        <div className="mt-4 flex flex-col items-center gap-3 py-2 border-y border-emerald-500/20">
          <QrImage
            url={href}
            alt={`QR code: open ${linkLabel} on your phone`}
            size={qrSize}
          />
          <p className="text-xs text-foreground/45 text-center leading-relaxed px-1">{qrDescription}</p>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-end sm:items-center">
          <a
            ref={openLinkRef}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-center px-4 py-2.5 rounded-none text-sm font-semibold border-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 transition-colors"
            onClick={(e) => {
              isolateActionInteraction(e);
              void onTrack(trackActionOpen);
              onClose();
            }}
          >
            Open {linkLabel}
          </a>
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 rounded-none text-sm font-medium border-2 border-card-border text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
            onClick={(e) => {
              isolateActionInteraction(e);
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default function MobileStoreDownload({
  href,
  linkLabel,
  qrDescription,
  trackActionOpen,
  storeClass,
  onTrack,
  modalQrSize = 192,
}: {
  href: string;
  linkLabel: string;
  qrDescription: string;
  trackActionOpen: string;
  storeClass: string;
  onTrack: (action: string) => void;
  /** Pixel width/height of QR inside the modal (hero can use a slightly larger code). */
  modalQrSize?: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={storeClass}
        onClick={(e) => {
          isolateActionInteraction(e);
          void onTrack(`${trackActionOpen}_modal`);
          setModalOpen(true);
        }}
        onPointerDownCapture={isolateActionInteraction}
      >
        {linkLabel}
      </button>
      {modalOpen ? (
        <StoreModal
          href={href}
          linkLabel={linkLabel}
          qrDescription={qrDescription}
          trackActionOpen={trackActionOpen}
          qrSize={modalQrSize}
          onClose={() => setModalOpen(false)}
          onTrack={onTrack}
        />
      ) : null}
    </>
  );
}
