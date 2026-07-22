"use client";

import { useEffect, useState } from "react";

interface WelcomeBannerProps {
  showWelcome: boolean | null;
  setShowFullInstructions: (show: boolean) => void;
  showFullInstructions: boolean;
  onDismiss: () => void;
}

export default function WelcomeBanner({
  showWelcome,
  setShowFullInstructions,
  showFullInstructions,
  onDismiss,
}: WelcomeBannerProps) {
  useEffect(() => {
    if (showWelcome === null) return;
    const dismissed = localStorage.getItem("cardpin:welcome_dismissed");
    if (dismissed) {
      setShowFullInstructions(false);
    }
  }, [showWelcome, setShowFullInstructions]);

  if (showWelcome !== true) return null;

  return (
    <section className="welcome-banner">
      <div className="welcome-banner-summary">
        <div className="welcome-banner-left">
          <span className="welcome-icon">💡</span>
          <span>
            Select cards in your wallet &rarr; search merchant &rarr; find best rewards.
          </span>
          <button
            type="button"
            className="learn-more-btn"
            onClick={() => setShowFullInstructions(!showFullInstructions)}
          >
            {showFullInstructions ? "Hide details" : "How it works"}
          </button>
        </div>
        <button
          type="button"
          className="dismiss-btn"
          onClick={onDismiss}
          aria-label="Dismiss guide"
        >
          &times;
        </button>
      </div>

      {showFullInstructions && (
        <div className="welcome-banner-details">
          <div className="welcome-details-grid">
            <div>
              <h3>1. Stage 1: Context Setting</h3>
              <p>
                Select your owned cards, specify transaction currency, merchant category, and transaction amount to anchor the reward calculation.
              </p>
            </div>
            <div>
              <h3>2. Stage 2: Recommendation Rationale</h3>
              <p>
                View your instant <strong>Tap This Card Now</strong> recommendation alongside plain-English story rationale explaining net return math and fee offsets.
              </p>
            </div>
            <div>
              <h3>3. Stage 3: Portfolio Opportunity Story</h3>
              <p>
                CardPin calculates un-owned catalog cards and highlights your next best unlock opportunity with exact comparative return deltas.
              </p>
            </div>
            <div>
              <h3>Community Sourced</h3>
              <p>
                Data is community-driven. Unsupported cards/rewards are intentionally omitted instead of guessed. Verify terms with your issuer.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
