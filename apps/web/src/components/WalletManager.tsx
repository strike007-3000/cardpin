"use client";

import React, { useEffect, useRef } from "react";
import type { Card, CountryDataset } from "@cardpin/engine";
import { orderCardsForWalletStack } from "../lib/utils";
import { WarnIcon } from "./Icons";

function WalletIcon() {
  return (
    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function CardNetworkLogo({ network }: { network: string }) {
  const net = network.toLowerCase();
  if (net === "mastercard") {
    return (
      <span className="network-logo network-logo--mastercard" aria-label="Mastercard">
        <span className="circle circle--red" />
        <span className="circle circle--orange" />
      </span>
    );
  }
  if (net === "visa") {
    return (
      <span className="network-logo network-logo--visa" aria-label="Visa">
        VISA
      </span>
    );
  }
  if (net === "amex" || net === "american-express") {
    return (
      <span className="network-logo network-logo--amex" aria-label="American Express">
        AMEX
      </span>
    );
  }
  return <span className="network-logo network-logo--generic">{network.toUpperCase()}</span>;
}

function getCardLastFour(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numeric = Math.abs(hash % 10000);
  return numeric.toString().padStart(4, "4");
}

function getCardThemeClass(issuerId: string, network: string) {
  const normalized = issuerId.toLowerCase();
  if (normalized.includes("american-express")) {
    if (normalized.includes("gold")) return "card-theme-amex-gold";
    if (normalized.includes("platinum")) return "card-theme-amex-platinum";
    return "card-theme-amex-green";
  }
  if (normalized.includes("n26")) {
    if (normalized.includes("metal")) return "card-theme-n26-metal";
    return "card-theme-n26-standard";
  }
  if (normalized.includes("dkb")) return "card-theme-dkb";
  if (normalized.includes("deutsche-bank") || normalized.includes("miles-and-more")) return "card-theme-deutsche-bank";
  if (normalized.includes("commerzbank")) return "card-theme-commerzbank";
  if (normalized.includes("barclays")) return "card-theme-barclays";
  if (normalized.includes("hanseatic")) return "card-theme-hanseatic";
  if (normalized.includes("advanzia")) return "card-theme-advanzia";
  if (normalized.includes("revolut")) {
    if (normalized.includes("metal")) return "card-theme-revolut-metal";
  }
  
  if (network === "visa") return "card-theme-fallback-visa";
  if (network === "mastercard") return "card-theme-fallback-mastercard";
  return "card-theme-fallback-amex";
}

function CapBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="cap-badge">
      <WarnIcon /> {children}
    </span>
  );
}

interface WalletCardProps {
  card: Card;
  issuerName: string;
  isActive: boolean;
  isCapExhausted: boolean;
  focusOnMount: boolean;
  monthlySpend: number;
  onSelect: () => void;
  onSpendChange: (value: number) => void;
  onRemove: () => void;
}

function WalletCard({ card, issuerName, isActive, isCapExhausted, focusOnMount, monthlySpend, onSelect, onSpendChange, onRemove }: WalletCardProps) {
  // Only the collapsed row is a control; the expanded card holds its own input and delete button.
  const Wrapper: React.ElementType = isActive ? "div" : "button";
  const ref = useRef<HTMLDivElement & HTMLButtonElement>(null);
  // Selecting swaps the focused <button> for a <div> (a fresh mount), so move focus to the expanded card and Tab continues from it.
  useEffect(() => {
    if (isActive && focusOnMount) ref.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
        <Wrapper
          ref={ref}
                    className={`wallet-card ${getCardThemeClass(card.id, card.network)} ${isActive ? "wallet-card--active" : "wallet-card--collapsed"}`}
          {...(isActive
            ? { role: "group", tabIndex: -1, "aria-label": `${card.name}, selected` }
            : { type: "button", onClick: onSelect, "aria-label": `Select ${card.name}` })}
        >
          <span className="card-texture" aria-hidden="true" />
          {isActive ? (
            <>
              <span className="wallet-card__topline">
                <span className="card-issuer-name">{issuerName}</span>
                {isCapExhausted && (
                  <span className="cap-badge">
                    <WarnIcon /> Cap reached
                  </span>
                )}
                <svg className="contactless-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 17a8 8 0 0 1 0-10" />
                  <path d="M9 19a12 12 0 0 1 0-14" />
                  <path d="M13 21a16 16 0 0 1 0-18" />
                </svg>
              </span>
              <span className="wallet-card__middle">
                <span className="card-chip" aria-hidden="true" />
                <span className="card-number-embossed">
                  •••• •••• •••• {getCardLastFour(card.id)}
                </span>
              </span>
              <span className="wallet-card__details">
                <span className="wallet-card__bottom-row">
                  <span className="card-holder-info">
                    <span className="card-name-display">{card.name}</span>
                  </span>
                  <CardNetworkLogo network={card.network} />
                </span>
              </span>
              <div className="wallet-card__inline-config">
                <div className="inline-spend-field">
                  <label htmlFor={`monthly-spend-${card.id}`}>Spent this month:</label>
                  <div className="spend-input-wrapper spend-input-wrapper--small">
                    <span className="currency-prefix">{card.currency}</span>
                    <input
                      id={`monthly-spend-${card.id}`}
                      aria-label={`Spent this month on ${card.name}`}
                      className="bare-input"
                      type="number"
                      min="0"
                      value={monthlySpend || ""}
                      onChange={(e) => onSpendChange(Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="card-remove-icon-btn"
                  title="Remove from wallet"
                  aria-label={`Remove ${card.name} from wallet`}
                  onClick={onRemove}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <span className="wallet-card__collapsed-row">
              <span className="card-issuer-name">{issuerName}</span>
              <span className="card-name-display">{card.name}</span>
              {isCapExhausted && (
                <span className="cap-badge">
                  <WarnIcon /> Cap
                </span>
              )}
              <CardNetworkLogo network={card.network} />
            </span>
          )}
        </Wrapper>

  );
}

interface WalletManagerProps {
  pointValue: number;
  setPointValue: (v: number) => void;
  country: string;
  ownedCardIds: string[];
  ownedCards: Card[];
  availableCards: Card[];
  activeCardId: string | null;
  setActiveCardId: (id: string | null) => void;
  cardMonthlySpends: Record<string, number>;
  handleUpdateMonthlySpend: (cardId: string, value: number) => void;
  handleToggleCard: (cardId: string) => void;
  handleExportWallet: () => void;
  handleImportWallet: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setOwnedCardIds: (ids: string[]) => void;
  dataset: CountryDataset | null;
  catalogSearch: string;
  setCatalogSearch: (q: string) => void;
  catalogCards: Card[];
  handleOpenCatalog: () => void;
  handleCloseCatalog: () => void;
  catalogDialogRef: React.RefObject<HTMLDialogElement | null>;
  catalogSearchRef: React.RefObject<HTMLInputElement | null>;
}

export default function WalletManager({
  pointValue,
  setPointValue,
  country,
  ownedCardIds,
  ownedCards,
  activeCardId,
  setActiveCardId,
  cardMonthlySpends,
  handleUpdateMonthlySpend,
  handleToggleCard,
  handleExportWallet,
  handleImportWallet,
  setOwnedCardIds,
  dataset,
  catalogSearch,
  setCatalogSearch,
  catalogCards,
  handleOpenCatalog,
  handleCloseCatalog,
  catalogDialogRef,
  catalogSearchRef,
}: WalletManagerProps) {
  const activeCard = ownedCards.find((c) => c.id === activeCardId) || null;
  const menuRef = useRef<HTMLDetailsElement>(null);
  const justSelected = useRef<string | null>(null);

  // <details> has no built-in dismissal: close on Escape (and return focus) or a click outside.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <>
      <section className="card step-card wallet-manager-card">
        <div className="step-header">
          <div className="step-icon-wrapper">
            <WalletIcon />
          </div>
          <div className="step-title-block step-title-block--full">
            <div className="section-title-row wallet-title-row">
              <h2>Your Wallet</h2>
              <span className="quiet-pill">{ownedCards.length} in wallet</span>
            </div>
          </div>
        </div>

        {ownedCards.length === 0 ? (
          <div className="empty-state empty-state--spaced">
            Your wallet is empty. Add some cards to get started!
          </div>
        ) : (
          <>
            <label className="point-value-field">
              1 point / mile ≈
              <select value={pointValue} onChange={(e) => setPointValue(Number(e.target.value))}>
                <option value={0.005}>0.5¢</option>
                <option value={0.01}>1¢</option>
                <option value={0.015}>1.5¢</option>
                <option value={0.02}>2¢</option>
              </select>
            </label>
            <div className="wallet-stack">
              {orderCardsForWalletStack(ownedCards, activeCardId).map((card) => {
                const cardRules = dataset?.rewardRules.filter((r) => r.cardId === card.id) ?? [];
                const monthlySpend = cardMonthlySpends[card.id] ?? 0;
                const isCapExhausted = cardRules.some((rule) => {
                  const cap = rule.cap ?? rule.conditions?.cap;
                  return cap !== undefined && monthlySpend * rule.rewardValue >= cap;
                });
                return (
                  <WalletCard
                    key={card.id}
                    card={card}
                    issuerName={dataset?.issuers.find((issuer) => issuer.id === card.issuerId)?.name || ""}
                    isActive={activeCardId === card.id}
                    isCapExhausted={isCapExhausted}
                    focusOnMount={justSelected.current === card.id}
                    monthlySpend={monthlySpend}
                    onSelect={() => {
                      justSelected.current = card.id;
                      setActiveCardId(card.id);
                    }}
                    onSpendChange={(value) => handleUpdateMonthlySpend(card.id, value)}
                    onRemove={() => handleToggleCard(card.id)}
                  />
                );
              })}
            </div>
          </>
        )}

        <div className="wallet-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleOpenCatalog}
          >
            + Add Cards
          </button>

          <details className="wallet-menu" ref={menuRef}>
            <summary className="wallet-menu__trigger" aria-label="Wallet options">•••</summary>
            <div className="wallet-menu__popover">
              {ownedCardIds.length > 0 && (
                <>
                  <button type="button" onClick={handleExportWallet}>Export wallet</button>
                  <button
                    type="button"
                    className="wallet-menu__danger"
                    onClick={() => {
                      if (confirm("Are you sure you want to clear your wallet?")) {
                        setOwnedCardIds([]);
                        localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify([]));
                      }
                    }}
                  >
                    Clear wallet
                  </button>
                </>
              )}
              <label>
                Import wallet
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportWallet}
                  className="visually-hidden"
                />
              </label>
            </div>
          </details>
        </div>
      </section>

      {/* Catalog Dialog */}
      <dialog
        ref={catalogDialogRef}
        className="catalog-dialog"
        aria-labelledby="catalog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) handleCloseCatalog();
        }}
      >
        <div className="dev-panel catalog-panel">
          <div className="dev-panel-header">
            <h2 id="catalog-title">Card Catalog ({country.toUpperCase()})</h2>
            <button type="button" className="dev-close-btn" aria-label="Close card catalog" onClick={handleCloseCatalog}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="dev-panel-body">
            <div className="search-input-wrapper">
              <input
                ref={catalogSearchRef}
                type="text"
                className="search-input-field"
                aria-label="Search cards by name or issuer"
                placeholder="Search by card name or issuer..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>

            {catalogCards.length === 0 ? (
              <div className="empty-state empty-state--spaced">
                No cards match your search.
              </div>
            ) : (
              <div className="catalog-grid">
                {catalogCards.map((card) => {
                  const isSelected = ownedCardIds.includes(card.id);
                  const issuerName = dataset?.issuers.find((i) => i.id === card.issuerId)?.name || "";
                  return (
                    <button
                      type="button"
                      key={card.id}
                      className={`catalog-card-item ${isSelected ? "catalog-card-item--selected" : ""}`}
                      onClick={() => handleToggleCard(card.id)}
                    >
                      <div className="catalog-card-info">
                        <span className="catalog-card-issuer">{issuerName}</span>
                        <span className="catalog-card-name">{card.name}</span>
                        <span className="catalog-card-meta">
                          {card.network.toUpperCase()} · Fee: {card.currency} {card.annualFee} · FX: {((card.fxFeePercentage ?? 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className={`catalog-card-badge ${isSelected ? "catalog-card-badge--selected" : ""}`}>
                        {isSelected ? "In Wallet" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
