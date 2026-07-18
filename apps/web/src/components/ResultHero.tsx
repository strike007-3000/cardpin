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
        <div className="result-header">
          <div>
            <span className="badge">Best Card</span>
            <h2>{bestResult.card.name}</h2>
            <p className="card-meta">
              {bestResult.card.network.toUpperCase()} · {bestResult.label}
            </p>
          </div>
          <div className="val-display">
            <div className="val-amount">{rewardAmount(bestResult)}</div>
            <div className="val-label">Expected reward</div>
          </div>
        </div>

        <div className="result-grid">
          <div>
            <h3>Why this card</h3>
            <p className="result-explanation">{cleanExplanation(bestResult.rec.explanation)}</p>
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
          <span>Verified {bestResult.rule?.source.verifiedAt ?? bestResult.card.sourceProof?.verifiedAt ?? "unknown"}</span>
        </div>

        {alternatives.length > 0 && (
          <div className="alternatives-container">
            <h3>Alternatives</h3>
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
