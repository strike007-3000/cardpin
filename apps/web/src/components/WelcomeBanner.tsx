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
              <h3>1. Select Owned Cards</h3>
              <p>
                Choose country and audience, then select cards in the wallet. Your cards are stored in your browser&apos;s local storage.
              </p>
            </div>
            <div>
              <h3>2. Search & Compare</h3>
              <p>
                Enter a merchant name or choose a category. Enter your spend amount to calculate reward net value.
              </p>
            </div>
            <div>
              <h3>3. Separated Rewards</h3>
              <p>
                Cashback, points, and miles are separated, not aggregated, since their ultimate value depends on redemption methods.
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
