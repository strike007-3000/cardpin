"use client";

import React from "react";
import Logo from "../app/logo";

interface NavigationBarProps {
  isScrolled?: boolean;
}

export default function NavigationBar({ isScrolled = false }: NavigationBarProps) {
  return (
    <header className={isScrolled ? "scrolled-header" : ""}>
      <div className="logo-header">
        <Logo />
        <h1 className="brand-name">CardPin</h1>
      </div>
      <p className="subtitle">
        Maximize your credit card rewards. Compare cashback, points, and miles to find the best card in your wallet for groceries, travel, and shopping instantly.
      </p>
    </header>
  );
}
