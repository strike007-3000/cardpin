"use client";

import React, { useState } from "react";
import { PlaneIcon } from "./Icons";

function formatCategory(category: string) {
  return category.replaceAll("-", " ");
}

function getCurrencySymbol(curr: string): string {
  switch (curr.toUpperCase()) {
    case "USD":
    case "CAD":
    case "AUD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "INR":
      return "₹";
    case "SGD":
      return "S$";
    case "JPY":
      return "¥";
    case "CHF":
      return "₣";
    default:
      return `${curr} `;
  }
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
  isForeignSpend: boolean;
  setIsForeignSpend: (val: boolean) => void;
  categoriesList: string[];
  merchantNames: string[];
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
  isForeignSpend,
  setIsForeignSpend,
  categoriesList,
  merchantNames,
  handleSpendBlur,
  disabled,
}: InputStripProps) {
  const presets = ["10", "50", "100", "500"];
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const q = merchantQuery.trim().toLowerCase();
  // Custom list: the native datalist popup can't be styled or positioned on phones.
  const suggestions = q
    ? merchantNames.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 8)
    : [];

  return (
    <div className={`card input-strip-card ${disabled ? "input-strip-card--disabled" : ""}`}>
      <fieldset className="search-fields" disabled={disabled}>
        <div className="form-row input-strip-row">
          <div className="form-group form-group--merchant">
            <label htmlFor="merchant-input">Merchant</label>
            <input
              id="merchant-input"
              type="text"
              placeholder="Carrefour, Q8, Booking.com"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="merchant-suggestions"
              aria-activedescendant={open && highlight >= 0 ? `merchant-option-${highlight}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              value={merchantQuery}
              onChange={(event) => {
                setMerchantQuery(event.target.value);
                setHighlight(-1);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (!open || suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((highlight + 1) % suggestions.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((highlight - 1 + suggestions.length) % suggestions.length);
                } else if (e.key === "Enter" && highlight >= 0) {
                  e.preventDefault();
                  setMerchantQuery(suggestions[highlight]);
                  setOpen(false);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
            />
            {open && suggestions.length > 0 && (
              <ul id="merchant-suggestions" role="listbox" className="merchant-suggestions">
                {suggestions.map((name, i) => (
                  <li
                    key={name}
                    id={`merchant-option-${i}`}
                    role="option"
                    aria-selected={i === highlight}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setMerchantQuery(name);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group form-group--category">
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

          <div className="form-group form-group--spend">
            <label htmlFor="spend-input">Spend Amount</label>
            <div className="spend-input-wrapper">
              <span className="currency-prefix">{spendCurrency}</span>
              <input
                id="spend-input"
                className="bare-input"
                inputMode="decimal"
                type="number"
                min="0"
                value={spendInput}
                onBlur={handleSpendBlur}
                onChange={(event) => setSpendInput(event.target.value)}
              />
            </div>
            <div className="spend-presets">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`preset-chip ${spendInput === amt ? "preset-chip--active" : ""}`}
                  onClick={() => setSpendInput(amt)}
                >
                  {getCurrencySymbol(spendCurrency)}{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group form-group--currency">
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
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="SEK">SEK (kr)</option>
              <option value="NOK">NOK (kr)</option>
              <option value="DKK">DKK (kr)</option>
              <option value="PLN">PLN (zł)</option>
              <option value="CZK">CZK (Kč)</option>
            </select>
          </div>
        </div>

        <div className="checkbox-field">
          <input
            id="foreign-spend-checkbox"
            type="checkbox"
            checked={isForeignSpend}
            onChange={(e) => setIsForeignSpend(e.target.checked)}
          />
          <label htmlFor="foreign-spend-checkbox">
            <PlaneIcon /> Spending abroad / Foreign transaction (applies FX fee if non-zero)
          </label>
        </div>
      </fieldset>
    </div>
  );
}
