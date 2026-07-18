"use client";

import React from "react";

interface MainLayoutProps {
  navigationBar: React.ReactNode;
  welcomeBanner?: React.ReactNode;
  compactControls: React.ReactNode;
  walletSetup: React.ReactNode;
  merchantSelector: React.ReactNode;
  cardDisplay: React.ReactNode;
}

export default function MainLayout({
  navigationBar,
  welcomeBanner,
  compactControls,
  walletSetup,
  merchantSelector,
  cardDisplay,
}: MainLayoutProps) {
  return (
    <div className="main-layout-container">
      {navigationBar}
      <main className="flow-layout-stacked">
        {welcomeBanner}
        {compactControls}
        
        <div className="columns-grid">
          <div className="left-column">
            {walletSetup}
          </div>
          <div className="right-column">
            {merchantSelector}
            {cardDisplay}
          </div>
        </div>
      </main>
    </div>
  );
}
