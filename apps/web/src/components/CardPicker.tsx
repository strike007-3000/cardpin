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

interface CardPickerProps {
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

export default function CardPicker({
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
}: CardPickerProps) {
  return (
    <section className="card search-card">
      <div className="search-card-header">
        <div className="title-with-icon">
          <SearchIcon />
          <h2>Optimize Transaction</h2>
        </div>
      </div>
      
      <div className="search-card-content-wrapper">
        <fieldset className="search-fields" disabled={ownedCardsLength === 0}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="merchant-input">Merchant name</label>
              <input
                id="merchant-input"
                type="text"
                placeholder="e.g. Carrefour, Lidl, Booking.com"
                value={merchantQuery}
                onChange={(event) => setMerchantQuery(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="category-select">Or choose category</label>
              <select id="category-select" value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)}>
                <option value="">Select category...</option>
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
              <label htmlFor="spend-input">Spend amount</label>
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
          
          <p className="helper-text helper-text--compact">
            Non-EUR currency converts rates and includes issuer FX fees automatically.
          </p>
        </fieldset>

        {ownedCardsLength === 0 && (
          <div className="search-lock-overlay">
            <div className="search-lock-message">
              <span className="lock-icon" role="img" aria-label="lock">🔒</span>
              <h3>Setup Your Wallet First</h3>
              <p>Add at least one card to your wallet to start optimizing rewards.</p>
              <button type="button" className="btn btn--primary" onClick={handleOpenCatalog}>
                Add Card to Unlock
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
