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

          <div className="form-group" style={{ flex: "1.5" }}>
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
