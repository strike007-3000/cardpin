"use client";

import React from "react";

interface MainLayoutProps {
  navigationBar: React.ReactNode;
  walletSetup: React.ReactNode;
  merchantSelector: React.ReactNode;
  cardDisplay: React.ReactNode;
}

export default function MainLayout({
  navigationBar,
  walletSetup,
  merchantSelector,
  cardDisplay,
}: MainLayoutProps) {
  return (
    <div className="main-layout-container">
      {navigationBar}
      <div className="redesigned-grid-container">
        {walletSetup}
        {merchantSelector}
        {cardDisplay}
      </div>
    </div>
  );
}
