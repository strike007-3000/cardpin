"use client";

import React from "react";
import { WarnIcon } from "./Icons";
import type { CardCalc } from "../lib/utils";
import { breakEvenPurchases, formatRelativeDate } from "../lib/utils";

interface ResultHeroProps {
  bestResult: CardCalc;
  spendAmount: number;
  spendCurrency: string;
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
  spendCurrency,
  isForeignSpend,
  rewardAmount,
  cleanExplanation,
  rewardLabel,
  alternatives,
  cardMonthlySpends = {},
}: ResultHeroProps) {
  const isFallbackCard = !bestResult.rule;
  const unlock = bestResult.rec.unownedUnlockCard;
  const unlockFee = unlock?.card.annualFee ?? 0;
  const breakEven = unlock ? breakEvenPurchases(unlockFee, unlock.convertedValue - bestResult.netValue) : null;
  // Amex is often refused at the terminal in Europe, so offer the best alternative on another network.
  const nonAmexAlt = bestResult.card.network === "amex" ? alternatives.find((r) => r.card.network !== "amex") : undefined;

  return (
    <section className="recommendation-area result-hero-section" aria-live="polite">
      <div className="result-box result-hero-box">
        <div className="result-header">
          <div>
            <span className={`badge ${isFallbackCard ? "badge--neutral" : ""}`}>
              {isFallbackCard ? "Best Base Card" : "Best Card"}
            </span>
            <h2>{bestResult.card.name}</h2>
            <p className="card-meta">
              {bestResult.card.network.toUpperCase()} · {isFallbackCard ? "No specific bonus rule" : bestResult.label}
            </p>
          </div>
          <div className="val-display">
            <div className="val-amount">{rewardAmount(bestResult)}</div>
            <div className="val-label">Net return</div>
          </div>
        </div>

        {nonAmexAlt && (
          <p className="result-note">
            Amex not accepted? Use <strong>{nonAmexAlt.card.name}</strong> ({rewardAmount(nonAmexAlt)}).
          </p>
        )}

        <div className="result-grid">
          <div>
            <h3>Why this card</h3>
            <p className="result-explanation">
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
              {spendCurrency} {spendAmount.toFixed(2)} spend · {rewardLabel(bestResult)}
              {isForeignSpend ? ` · ${bestResult.card.currency} ${bestResult.fxFee.toFixed(2)} FX fee` : ""}
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
          <a
            href={`https://github.com/strike007-3000/Cardpin/issues/new?template=update_rewards.yml&title=${encodeURIComponent(`Update Card: ${bestResult.card.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Report wrong data
          </a>
          <span>
            Verified {formatRelativeDate(bestResult.rule?.source.verifiedAt ?? bestResult.card.sourceProof?.verifiedAt)}
          </span>
        </div>

        {bestResult.rec.unownedUnlockCard && (
          <div className="unlock-banner">
            <div className="unlock-banner-head">
              <span className="badge unlock-tag">
                Next Card to Unlock
              </span>
              <span className="unlock-amount">
                {bestResult.rec.unownedUnlockCard.rewardType === "points"
                  ? `+${bestResult.rec.unownedUnlockCard.estimatedValue.toFixed(0)} points`
                  : bestResult.rec.unownedUnlockCard.rewardType === "miles"
                  ? `+${bestResult.rec.unownedUnlockCard.estimatedValue.toFixed(0)} miles`
                  : bestResult.rewardType === "points" || bestResult.rewardType === "miles"
                  ? `≈ ${bestResult.rec.unownedUnlockCard.card.currency} ${bestResult.rec.unownedUnlockCard.convertedValue.toFixed(2)} back`
                  : `+${bestResult.rec.unownedUnlockCard.card.currency} ${Math.max(0, bestResult.rec.unownedUnlockCard.convertedValue - bestResult.netValue).toFixed(2)} extra`}
              </span>
            </div>
            <h4>{bestResult.rec.unownedUnlockCard.card.name}</h4>
            <p>
              {bestResult.rec.unownedUnlockCard.explanation}
            </p>
            <p className="unlock-fee">
              {unlockFee
                ? `Annual fee: ${unlock?.card.currency} ${unlockFee}/yr${breakEven ? ` · ~${breakEven} purchases like this to cover it` : ""}`
                : "No annual fee"}
            </p>
          </div>
        )}

        {alternatives.length > 0 && (
          <div className="alternatives-container">
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

              let reasonTag: React.ReactNode = "";
              if (isCapReached) reasonTag = <><WarnIcon /> Cap reached</>;
              else if (isMinSpendNotMet) reasonTag = <><WarnIcon /> Min spend €{minSpend} not met</>;
              else if (!rule) reasonTag = "No bonus rule";

              return (
                <div className="alt-card" key={result.card.id}>
                  <div className="alt-card-bar" style={{ width: `${percentage}%` }} />
                  <span className="alt-name">{result.card.name}</span>
                  <span className="alt-value">
                    {reasonTag ? <span className="alt-reason">{reasonTag}</span> : null}
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
