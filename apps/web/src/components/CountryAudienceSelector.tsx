"use client";

import React from "react";

function GlobeIcon() {
  return (
    <svg
      className="step-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

interface CountryAudienceSelectorProps {
  country: string;
  setCountry: (country: string) => void;
  audience: "consumer" | "business";
  setAudience: (audience: "consumer" | "business") => void;
}

export default function CountryAudienceSelector({
  country,
  setCountry,
  audience,
  setAudience,
}: CountryAudienceSelectorProps) {
  return (
    <div className="compact-controls-strip">
      <div className="compact-control-group">
        <label htmlFor="country-select" className="visually-hidden">
          Country
        </label>
        <div className="select-wrapper-compact">
          <GlobeIcon />
          <select
            id="country-select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="compact-select"
          >
            <option value="be">BE (Belgium)</option>
            <option value="de">DE (Germany)</option>
            <option value="nl">NL (Netherlands)</option>
            <option value="us">US (United States)</option>
          </select>
        </div>
      </div>

      <div className="compact-control-group">
        <div
          className="segmented-control segmented-control--compact"
          role="group"
          aria-label="Audience"
        >
          <button
            type="button"
            aria-pressed={audience === "consumer"}
            className={audience === "consumer" ? "active" : ""}
            onClick={() => setAudience("consumer")}
          >
            Consumer
          </button>
          <button
            type="button"
            aria-pressed={audience === "business"}
            className={audience === "business" ? "active" : ""}
            onClick={() => setAudience("business")}
          >
            Business
          </button>
        </div>
      </div>
    </div>
  );
}
