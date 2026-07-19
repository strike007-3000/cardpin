"use client";

import React from "react";

interface MainLayoutProps {
  navigationBar: React.ReactNode;
  welcomeBanner?: React.ReactNode;
  countryAudienceSelector: React.ReactNode;
  resultHeroOrStatus: React.ReactNode;
  inputStrip: React.ReactNode;
  walletManager: React.ReactNode;
}

export default function MainLayout({
  navigationBar,
  welcomeBanner,
  countryAudienceSelector,
  resultHeroOrStatus,
  inputStrip,
  walletManager,
}: MainLayoutProps) {
  return (
    <div className="main-layout-container">
      {navigationBar}
      <main className="flow-layout-stacked">
        {welcomeBanner}
        
        <div className="cardpin-grid">
          <div className="cardpin-left-col">
            <div className="grid-area-top">
              {countryAudienceSelector}
            </div>
            <div className="grid-area-hero">
              {resultHeroOrStatus}
            </div>
            <div className="grid-area-bottom">
              {inputStrip}
            </div>
          </div>
          <div className="cardpin-right-col">
            <div className="grid-area-wallet">
              {walletManager}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
