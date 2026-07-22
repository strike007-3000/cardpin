"use client";

import React from "react";
import type { Card } from "@cardpin/engine";
import type { CardCalc } from "../lib/utils";

interface ResultHeroProps {
  bestResult: CardCalc;
  spendAmount: number;
  isForeignSpend: boolean;
  rewardAmount: (result: CardCalc) => string;
  cleanExplanation: (explanation: string) => string;
  rewardLabel: (result: CardCalc) => string;
  alternatives: CardCalc[];
}

export default function ResultHero({
  bestResult,
  spendAmount,
  isForeignSpend,
  rewardAmount,
  cleanExplanation,
  rewardLabel,
  alternatives,
}: ResultHeroProps) {
  return (
    <section className="recommendation-area result-hero-section">
      <div className="result-box result-hero-box">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ background: "#22c55e", color: "#0f172a", borderRadius: "9999px", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>2</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.85 }}>Stage 2: Recommendation Rationale</span>
        </div>

        <div className="result-header">
          <div>
            <span className="badge" style={{ background: "#22c55e", color: "#0f172a", fontWeight: 700 }}>TAP THIS CARD NOW</span>
            <h2 style={{ marginTop: "0.25rem" }}>{bestResult.card.name}</h2>
            <p className="card-meta">
              {bestResult.card.network.toUpperCase()} · {bestResult.label}
            </p>
          </div>
          <div className="val-display">
            <div className="val-amount">{rewardAmount(bestResult)}</div>
            <div className="val-label">Net return</div>
          </div>
        </div>

        <div className="result-grid" style={{ marginTop: "1rem" }}>
          <div>
            <h3>📖 Reward Story & Rationale</h3>
            <p className="result-explanation" style={{ lineHeight: 1.5, fontSize: "0.95rem" }}>
              {cleanExplanation(bestResult.rec.explanation)}
            </p>
          </div>
          <div>
            <h3>Formula breakdown</h3>
            <p className="result-calculation" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
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
          <span>Verified {bestResult.rule?.source.verifiedAt ?? bestResult.card.sourceProof?.verifiedAt ?? "unknown"}</span>
        </div>

        {bestResult.rec.unownedUnlockCard && (
          <div className="unlock-banner" style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: "10px", background: "rgba(129, 140, 248, 0.1)", border: "1px solid rgba(129, 140, 248, 0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ background: "#818cf8", color: "#0f172a", borderRadius: "9999px", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>3</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#818cf8" }}>
                Stage 3: Portfolio Opportunity Story
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{bestResult.rec.unownedUnlockCard.card.name}</h4>
              <span style={{ fontWeight: 700, color: "#22c55e", fontSize: "0.95rem" }}>
                {bestResult.rec.unownedUnlockCard.rewardType === "points"
                  ? `+${bestResult.rec.unownedUnlockCard.estimatedValue.toFixed(0)} points`
                  : bestResult.rec.unownedUnlockCard.rewardType === "miles"
                  ? `+${bestResult.rec.unownedUnlockCard.estimatedValue.toFixed(0)} miles`
                  : `+EUR ${(bestResult.rec.unownedUnlockCard.convertedValue - bestResult.netValue).toFixed(2)} extra`}
              </span>
            </div>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.4 }}>
              {bestResult.rec.unownedUnlockCard.explanation}
            </p>
          </div>
        )}

        {alternatives.length > 0 && (
          <div className="alternatives-container" style={{ marginTop: "1.25rem" }}>
            <h3>Alternative Owned Cards</h3>
            {alternatives.map((result) => {
              const bestValue = bestResult ? bestResult.netValue : 0;
              const percentage = bestValue > 0 ? Math.min(100, Math.max(0, (result.netValue / bestValue) * 100)) : 0;
              return (
                <div className="alt-card" key={result.card.id}>
                  <div className="alt-card-bar" style={{ width: `${percentage}%` }} />
                  <span className="alt-name">{result.card.name}</span>
                  <span className="alt-value">{result.rule ? rewardAmount(result) : "No sourced reward"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
