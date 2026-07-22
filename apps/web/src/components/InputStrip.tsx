"use client";

import React from "react";

function formatCategory(category: string) {
  return category.replaceAll("-", " ");
}

interface InputStripProps {
  merchantQuery: string;
  setMerchantQuery: (q: string) => void;
  categoryQuery: string;
  setCategoryQuery: (q: string) => void;
  spendInput: string;
  setSpendInput: (val: string) => void;
  spendCurrency: string;
  setSpendCurrency: (val: string) => void;
  categoriesList: string[];
  handleSpendBlur: () => void;
  disabled: boolean;
}

export default function InputStrip({
  merchantQuery,
  setMerchantQuery,
  categoryQuery,
  setCategoryQuery,
  spendInput,
  setSpendInput,
  spendCurrency,
  setSpendCurrency,
  categoriesList,
  handleSpendBlur,
  disabled,
}: InputStripProps) {
  const presets = ["10", "50", "100", "500"];

  return (
    <div className={`card input-strip-card ${disabled ? "input-strip-card--disabled" : ""}`}>
      <fieldset className="search-fields" disabled={disabled} style={{ border: "none", padding: 0, margin: 0 }}>
        <div className="form-row input-strip-row">
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
            <select
              id="category-select"
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
            >
              <option value="">Choose a category</option>
              {categoriesList.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: "1.5", minWidth: 0 }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSpendInput(amt)}
                  style={{
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.72rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: spendInput === amt ? "var(--bg-surface-elevated, rgba(56, 189, 248, 0.15))" : "transparent",
                    color: spendInput === amt ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {spendCurrency === "EUR" ? "€" : spendCurrency === "USD" ? "$" : ""}{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ flex: "0.8" }}>
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
      </fieldset>
    </div>
  );
}
