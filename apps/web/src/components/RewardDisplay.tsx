"use client";

import React from "react";
import type { Card, recommendBestCard } from "@cardpin/engine";

type CardCalc = {
  card: Card;
  rule: ReturnType<typeof recommendBestCard>["bestRule"];
  rec: ReturnType<typeof recommendBestCard>;
  rewardType: ReturnType<typeof recommendBestCard>["rewardType"];
  grossValue: number;
  fxFee: number;
  netValue: number;
  label: string;
};

interface RewardDisplayProps {
  ownedCardsLength: number;
  hasSearch: boolean;
  isFxRateMissing: boolean;
  fxStatus: "idle" | "loading" | "ready" | "error";
  spendCurrency: string;
  bestResult: CardCalc | null;
  rewardAmount: (result: CardCalc) => string;
  cleanExplanation: (explanation: string) => string;
  rewardLabel: (result: CardCalc) => string;
  spendAmount: number;
  isForeignSpend: boolean;
  alternatives: CardCalc[];
}

function CreditCardPlaceholder() {
  return (
    <div className="placeholder-card-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "40px", height: "40px", opacity: 0.4 }}>
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="12" y2="15" />
      </svg>
    </div>
  );
}

export default function RewardDisplay({
  ownedCardsLength,
  hasSearch,
  isFxRateMissing,
  fxStatus,
  spendCurrency,
  bestResult,
  rewardAmount,
  cleanExplanation,
  rewardLabel,
  spendAmount,
  isForeignSpend,
  alternatives,
}: RewardDisplayProps) {
  if (ownedCardsLength === 0) {
    return (
      <div className="card empty-state">
        <CreditCardPlaceholder />
        <strong>Wallet Setup Required</strong>
        <p>Add some cards to your wallet to start optimizing your rewards.</p>
      </div>
    );
  }

  if (!hasSearch) {
    return (
      <div className="card empty-state">
        <CreditCardPlaceholder />
        <strong>Ready to Compare</strong>
        <p>Enter a merchant or select a category above to find the optimal card.</p>
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
            ? "Reconnect and try again to calculate FX-adjusted rewards."
            : `Waiting for the ${spendCurrency} exchange rate before calculating.`}
        </p>
      </div>
    );
  }

  if (!bestResult) {
    return (
      <div className="card empty-state empty-state--left">
        <strong>No Reward Rules Sourced</strong>
        <p>
          Unsupported cards or rules are intentionally omitted to avoid inaccurate assumptions.
        </p>
        <p>
          Check with your card issuer directly for the most current rewards terms.
        </p>
      </div>
    );
  }

  return (
    <section className="recommendation-area">
      <div className="result-box">
        <div className="result-header">
          <div className="best-card-info">
            <span className="badge">Best Choice</span>
            <h2>{bestResult.card.name}</h2>
            <p className="card-meta">
              {bestResult.card.network.toUpperCase()} · {bestResult.label}
            </p>
          </div>
          <div className="val-display">
            <div className="val-amount">{rewardAmount(bestResult)}</div>
            <div className="val-label">Expected value</div>
          </div>
        </div>

        <div className="result-grid">
          <div>
            <h3>Reasoning</h3>
            <p className="result-explanation">{cleanExplanation(bestResult.rec.explanation)}</p>
          </div>
          <div>
            <h3>Breakdown</h3>
            <p className="result-calculation">
              EUR {spendAmount.toFixed(2)} spend · {rewardLabel(bestResult)}
              {isForeignSpend ? ` · EUR ${bestResult.fxFee.toFixed(2)} FX fee` : ""}
            </p>
          </div>
        </div>

        <div className="source-strip">
          {bestResult.rule && (
            <a href={bestResult.rule.source.sourceUrl} target="_blank" rel="noopener noreferrer">
              Reward terms
            </a>
          )}
          {bestResult.card.sourceProof && (
            <a href={bestResult.card.sourceProof.sourceUrl} target="_blank" rel="noopener noreferrer">
              Issuer source
            </a>
          )}
          <span>Verified {bestResult.rule?.source.verifiedAt ?? bestResult.card.sourceProof?.verifiedAt ?? "unknown"}</span>
        </div>

        {alternatives.length > 0 && (
          <div className="alternatives-container">
            <h3>Other Cards</h3>
            <div className="alternatives-list">
              {alternatives.map((result) => {
                const bestValue = bestResult ? bestResult.netValue : 0;
                const percentage = bestValue > 0 ? Math.min(100, Math.max(0, (result.netValue / bestValue) * 100)) : 0;
                return (
                  <div className="alt-card" key={result.card.id}>
                    <div className="alt-card-bar" style={{ width: `${percentage}%` }} />
                    <span className="alt-name">{result.card.name}</span>
                    <span className="alt-value">{result.rule ? rewardAmount(result) : "No reward"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
