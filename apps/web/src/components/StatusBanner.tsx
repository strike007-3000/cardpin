"use client";

import React from "react";

function CreditCardPlaceholder() {
  return (
    <div className="placeholder-card-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="12" y2="15" />
      </svg>
    </div>
  );
}

interface StatusBannerProps {
  ownedCardsLength: number;
  hasSearch: boolean;
  isFxRateMissing: boolean;
  fxStatus: "idle" | "loading" | "ready" | "error";
  spendCurrency: string;
  error: string | null;
  bestResultExists: boolean;
  handleOpenCatalog: () => void;
}

export default function StatusBanner({
  ownedCardsLength,
  hasSearch,
  isFxRateMissing,
  fxStatus,
  spendCurrency,
  error,
  bestResultExists,
  handleOpenCatalog,
}: StatusBannerProps) {
  if (error) {
    return (
      <div className="card error-card" role="status">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (ownedCardsLength === 0) {
    return (
      <div className="card empty-state" role="status">
        <CreditCardPlaceholder />
        <strong>No cards in your wallet.</strong>
        <p>
          Add some cards to your wallet to start comparing and optimizing rewards.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleOpenCatalog}
          style={{ marginTop: "12px" }}
        >
          Add a Card
        </button>
      </div>
    );
  }

  if (!hasSearch) {
    return (
      <div className="card empty-state" role="status">
        <CreditCardPlaceholder />
        <strong>Ready to search.</strong>
        <p>
          Enter a merchant or choose a category above to find the optimal card to use.
        </p>
      </div>
    );
  }

  if (isFxRateMissing) {
    return (
      <div className="card empty-state" role="status">
        <CreditCardPlaceholder />
        <strong>{fxStatus === "error" ? "Exchange rate unavailable." : "Loading exchange rate…"}</strong>
        <p>
          {fxStatus === "error"
            ? "Reconnect and select the currency again to calculate accurate rewards."
            : `Waiting for the ${spendCurrency} rate before calculating rewards.`}
        </p>
      </div>
    );
  }

  if (!bestResultExists) {
    return (
      <div className="card empty-state empty-state--left" role="status">
        <strong>No matching reward rules found.</strong>
        <p>
          Unsupported cards or rewards are intentionally omitted rather than assumed or guessed.
        </p>
        <p>
          Please verify terms with your issuer before relying on any benefit.
        </p>
      </div>
    );
  }

  return null;
}
