"use client";

import CardPinCalculator from "./CardPinCalculator";
import DarkModeToggle from "../components/DarkModeToggle";

export default function HomePage() {
  return (
    <div className="container min-h-screen bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      <DarkModeToggle />
      <CardPinCalculator />

      <footer className="site-footer">
        CardPin is not financial advice. Sources and reward rules are community-sourced; always verify current terms with your issuer before use.
      </footer>
    </div>
  );
}
