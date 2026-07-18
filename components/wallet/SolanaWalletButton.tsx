"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useRef, useState } from "react";

function truncateAddress(address: string) {
  if (address.length <= 9) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function SolanaWalletButton({ className = "" }: { className?: string }) {
  const { connected, connecting, disconnect, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const address = publicKey?.toBase58() ?? "";

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function copyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (!connected) {
    return (
      <button
        type="button"
        className={`atlas-wallet-button atlas-wallet-button-disconnected ${className}`}
        disabled={connecting}
        aria-busy={connecting}
        onClick={() => setVisible(true)}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div ref={menuRef} className={`atlas-wallet-menu ${className}`}>
      <button
        type="button"
        className="atlas-wallet-button atlas-wallet-button-connected"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="font-mono tabular-nums">{truncateAddress(address)}</span>
      </button>

      {menuOpen ? (
        <div className="atlas-wallet-popover" role="menu">
          <button type="button" role="menuitem" onClick={copyAddress}>
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setVisible(true);
            }}
          >
            Change wallet
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              disconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
