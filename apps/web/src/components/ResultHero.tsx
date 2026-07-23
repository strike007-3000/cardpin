"use client";

import React from "react";
import type { CardCalc } from "../lib/utils";
import { formatRelativeDate } from "../lib/utils";

interface ResultHeroProps {
  bestResult: CardCalc;
  spendAmount: number;
  isForeignSpend: boolean;
  rewardAmount: (result: CardCalc) => string;
  cleanExplanation: (explanation: string) => string;
  rewardLabel: (result: CardCalc) => string;
  alternatives: CardCalc[];
  cardMonthlySpends?: Record<string, number>;
}

export default function ResultHero({
  bestResult,
  spendAmount,
  isForeignSpend,
  rewardAmount,
  cleanExplanation,
  rewardLabel,
  alternatives,
  cardMonthlySpends = {},
}: ResultHeroProps) {
  const isFallbackCard = !bestResult.rule;

  return (
    <section className="recommendation-area result-hero-section">
      <div className="result-box result-hero-box">
        <div className="result-header">
          <div>
            <span className="badge" style={isFallbackCard ? { background: "var(--bg-surface-elevated, #374151)", color: "#f3f4f6" } : undefined}>
              {isFallbackCard ? "Best Base Card" : "Best Card"}
            </span>
            <h2 style={{ marginTop: "0.25rem" }}>{bestResult.card.name}</h2>
            <p className="card-meta">
              {bestResult.card.network.toUpperCase()} · {isFallbackCard ? "No specific bonus rule" : bestResult.label}
            </p>
          </div>
          <div className="val-display">
            <div className="val-amount">{rewardAmount(bestResult)}</div>
            <div className="val-label">Net return</div>
          </div>
        </div>

        <div className="result-grid" style={{ marginTop: "1rem" }}>
          <div>
            <h3>Why this card</h3>
            <p className="result-explanation" style={{ lineHeight: 1.5 }}>
              {isFallbackCard
                ? isForeignSpend && (bestResult.card.fxFeePercentage ?? 0) > 0
                  ? `No matching bonus reward rules found. ${bestResult.card.name} was chosen as your best base card for lowest fees (${(bestResult.card.fxFeePercentage! * 100).toFixed(1)}% FX fee).`
                  : `No matching bonus reward rules found. ${bestResult.card.name} was selected as your default base card.`
                : cleanExplanation(bestResult.rec.explanation)}
            </p>
          </div>
          <div>
            <h3>Spend calculation</h3>
            <p className="result-calculation">
              EUR {spendAmount.toFixed(2)} spend · {rewardLabel(bestResult)}
              {isForeignSpend ? ` · EUR ${bestResult.fxFee.toFixed(2)} FX fee` : ""}
            </p>
          </div>
        </div>

        <div className="source-strip">
          {bestResult.rule && (
            <a href={bestResult.rule.source.sourceUrl} target="_blank" rel="noopener noreferrer">
              Reward source
            </a>
          )}
          {bestResult.card.sourceProof && (
            <a href={bestResult.card.sourceProof.sourceUrl} target="_blank" rel="noopener noreferrer">
              Card source
            </a>
          )}
          <span>
            Verified {formatRelativeDate(bestResult.rule?.source.verifiedAt ?? bestResult.card.sourceProof?.verifiedAt)}
          </span>
        </div>

        {bestResult.rec.unownedUnlockCard && (
          <div className="unlock-banner" style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: "8px", background: "var(--bg-surface-elevated, rgba(99, 102, 241, 0.08))", border: "1px solid var(--border-color, rgba(99, 102, 241, 0.25))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="badge" style={{ background: "var(--accent, #6366f1)", color: "#fff", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                Next Card to Unlock
              </span>
              <span style={{ fontWeight: 700, color: "var(--accent-success, #22c55e)", fontSize: "0.95rem" }}>
                {bestResult.rec.unownedUnlockCard.rewardType === "points"
                  ? `+${bestResult.rec.unownedUnlockCard.estimatedValue.toFixed(0)} points`
                  : bestResult.rec.unownedUnlockCard.rewardType === "miles"
                  ? `+${bestResult.rec.unownedUnlockCard.estimatedValue.toFixed(0)} miles`
                  : `+EUR ${(bestResult.rec.unownedUnlockCard.convertedValue - bestResult.netValue).toFixed(2)} extra`}
              </span>
            </div>
            <h4 style={{ margin: "0.4rem 0 0.2rem 0", fontSize: "1rem", fontWeight: 700 }}>{bestResult.rec.unownedUnlockCard.card.name}</h4>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.4 }}>
              {bestResult.rec.unownedUnlockCard.explanation}
            </p>
          </div>
        )}

        {alternatives.length > 0 && (
          <div className="alternatives-container" style={{ marginTop: "1.25rem" }}>
            <h3>Alternatives</h3>
            {alternatives.map((result) => {
              const bestValue = bestResult ? bestResult.netValue : 0;
              const percentage = bestValue > 0 ? Math.min(100, Math.max(0, (result.netValue / bestValue) * 100)) : 0;
              
              const rule = result.rule;
              const cap = rule?.cap ?? rule?.conditions?.cap;
              const minSpend = rule?.conditions?.minSpend ?? 0;
              const monthlySpend = cardMonthlySpends[result.card.id] ?? 0;
              const isCapReached = cap !== undefined && (monthlySpend * (rule?.rewardValue ?? 0)) >= cap;
              
              // Evaluate minimum spend threshold against base currency spend
              const rate = isForeignSpend ? result.fxFee / (spendAmount * (result.card.fxFeePercentage || 1)) : 1;
              const convertedSpend = isForeignSpend && result.fxFee > 0 ? spendAmount - result.fxFee : spendAmount;
              const isMinSpendNotMet = minSpend > 0 && convertedSpend < minSpend;

              let reasonTag = "";
              if (isCapReached) reasonTag = "⚠️ Cap reached";
              else if (isMinSpendNotMet) reasonTag = `⚠️ Min spend €${minSpend} not met`;
              else if (!rule) reasonTag = "No bonus rule";

              return (
                <div className="alt-card" key={result.card.id}>
                  <div className="alt-card-bar" style={{ width: `${percentage}%` }} />
                  <span className="alt-name">{result.card.name}</span>
                  <span className="alt-value">
                    {reasonTag ? <span style={{ opacity: 0.75, fontSize: "0.8rem", marginRight: "6px" }}>{reasonTag}</span> : null}
                    {result.rule ? rewardAmount(result) : "€0.00"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
