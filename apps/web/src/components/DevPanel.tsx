"use client";

import { useRef, useState } from "react";

interface DevPanelProps {
  country: string;
  setCountry: (v: string) => void;
  dataType: string;
  setDataType: (v: string) => void;
  devJson: string;
  setDevJson: (v: string) => void;
  devStatus: { type: "success" | "error" | "loading"; message: string } | null;
  onMerge: () => Promise<void>;
  onClose: () => void;
}

export default function DevPanel({
  country,
  setCountry,
  dataType,
  setDataType,
  devJson,
  setDevJson,
  devStatus,
  onMerge,
  onClose,
}: DevPanelProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  async function handleSubmit() {
    setInternalLoading(true);
    try {
      await onMerge();
    } finally {
      setInternalLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dev-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dev-panel-header">
          <h3>Developer Data Manager</h3>
          <button className="dev-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="dev-panel-body">
          <div className="dev-flex-row">
            <div className="dev-flex-col">
              <label htmlFor="dev-country" className="dev-label">Country</label>
              <select
                id="dev-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="dev-select"
              >
                <option value="be">Belgium (BE)</option>
                <option value="de">Germany (DE)</option>
                <option value="nl">Netherlands (NL)</option>
              </select>
            </div>
            <div className="dev-flex-col">
              <label htmlFor="dev-datatype" className="dev-label">Data Type</label>
              <select
                id="dev-datatype"
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="dev-select"
              >
                <option value="issuers">Issuers</option>
                <option value="cards">Cards</option>
                <option value="merchants">Merchants</option>
                <option value="rewardRules">Reward Rules</option>
              </select>
            </div>
          </div>

          <div className="dev-flex-col">
            <label htmlFor="dev-json" className="dev-label">
              Paste JSON Array or Object
            </label>
            <textarea
              id="dev-json"
              className="dev-panel-textarea"
              value={devJson}
              onChange={(e) => setDevJson(e.target.value)}
              placeholder={`Example:
{
  "id": "new-item",
  "name": "New Item"
}`}
            />
          </div>

          {devStatus && (
            <div
              className={`dev-status-msg dev-status-msg--${devStatus.type}`}
            >
              {devStatus.message}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={devStatus?.type === "loading" || internalLoading}
            className="dev-submit-btn"
          >
            {internalLoading ? "Saving..." : "Merge & Recompile Datasets"}
          </button>
        </div>
      </div>
    </div>
  );
}
