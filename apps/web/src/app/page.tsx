"use client";

import CardPinCalculator from "./CardPinCalculator";
import Logo from "./logo";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="container">
      <header className={isScrolled ? "scrolled-header" : ""}>
        <div className="logo-header">
          <Logo />
          <h1 className="brand-name">CardPin</h1>
        </div>
        <p className="subtitle">
          Maximize your credit card rewards. Compare cashback, points, and miles to find the best card in your wallet for groceries, travel, and shopping instantly.
        </p>
      </header>

      <CardPinCalculator />
      
      <footer className="site-footer">
        CardPin is not financial advice. Sources and reward rules are community-sourced; always verify current terms with your issuer before use.
      </footer>
    </div>
  );
}
