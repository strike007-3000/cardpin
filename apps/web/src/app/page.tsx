"use client";

import CardPinCalculator from "./CardPinCalculator";

export default function HomePage() {
  return (
    <div className="container">
      <CardPinCalculator />
      
      <footer className="site-footer">
        CardPin is not financial advice. Sources and reward rules are community-sourced; always verify current terms with your issuer before use.
      </footer>
    </div>
  );
}
