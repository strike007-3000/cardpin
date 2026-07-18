"use client";

import React from "react";

function SearchIcon() {
  return (
    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function formatCategory(category: string) {
  return category.replaceAll("-", " ");
}

interface MerchantSelectorProps {
  merchantQuery: string;
  setMerchantQuery: (q: string) => void;
  categoryQuery: string;
  setCategoryQuery: (q: string) => void;
  spendInput: string;
  setSpendInput: (val: string) => void;
  spendCurrency: string;
  setSpendCurrency: (val: string) => void;
  categoriesList: string[];
  ownedCardsLength: number;
  handleSpendBlur: () => void;
  handleOpenCatalog: () => void;
}

export default function MerchantSelector({
  merchantQuery,
  setMerchantQuery,
  categoryQuery,
  setCategoryQuery,
  spendInput,
  setSpendInput,
  spendCurrency,
  setSpendCurrency,
  categoriesList,
  ownedCardsLength,
  handleSpendBlur,
  handleOpenCatalog,
}: MerchantSelectorProps) {
  return (
    <section className="card step-card step-card--search">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <SearchIcon />
        </div>
        <div className="step-title-block">
          <div className="step-kicker">Step 3</div>
          <h2>Search Purchase</h2>
        </div>
      </div>
      <p className="helper-text prominent">Search a merchant or choose a category. You can use either one.</p>
      
      <div className="search-card-content-wrapper">
        <fieldset className="search-fields" disabled={ownedCardsLength === 0}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="merchant-input">Merchant</label>
              <input
                id="merchant-input"
                type="text"
                placeholder="Carrefour, Q8, Booking.com"
                value={merchantQuery}
                onChange={(event) => setMerchantQuery(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="category-select">Category</label>
              <select id="category-select" value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)}>
                <option value="">Choose a category</option>
                {categoriesList.map((category) => (
                  <option key={category} value={category}>
                    {formatCategory(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: "2" }}>
              <label htmlFor="spend-input">Spend Amount</label>
              <div className="spend-input-wrapper">
                <span className="currency-prefix">{spendCurrency}</span>
                <input
                  id="spend-input"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  value={spendInput}
                  onBlur={handleSpendBlur}
                  onChange={(event) => setSpendInput(event.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ flex: "1" }}>
              <label htmlFor="currency-select">Currency</label>
              <select
                id="currency-select"
                value={spendCurrency}
                onChange={(e) => setSpendCurrency(e.target.value)}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CHF">CHF (₣)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>
          
          <p className="helper-text" style={{ marginTop: "10px", fontSize: "0.82rem" }}>
            Selecting a non-EUR currency fetches live exchange rates and automatically applies the card&apos;s foreign transaction fee.
          </p>
        </fieldset>

        {ownedCardsLength === 0 && (
          <div className="search-lock-overlay">
            <div className="search-lock-message">
              <span className="lock-icon" role="img" aria-label="lock">🔒</span>
              <h3>Search is Locked</h3>
              <p style={{ marginBottom: "16px" }}>Add at least one card to your wallet in Step 2 to search merchants and optimize rewards.</p>
              <button type="button" className="btn btn--primary prerequisite-action" onClick={handleOpenCatalog}>
                Add a Card to Unlock
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
