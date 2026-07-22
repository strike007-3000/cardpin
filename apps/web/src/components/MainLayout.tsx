import type { ReactNode } from "react";

interface MainLayoutProps {
  navigationBar: ReactNode;
  welcomeBanner?: ReactNode;
  countryAudienceSelector: ReactNode;
  resultHeroOrStatus: ReactNode;
  inputStrip: ReactNode;
  walletManager: ReactNode;
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
