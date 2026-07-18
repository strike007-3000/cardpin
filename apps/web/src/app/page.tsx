import CardPinCalculator from "./CardPinCalculator";
import Logo from "./logo";

export default function HomePage() {
  return (
    <div className="container">
      <header>
        <div className="logo-header">
          <Logo />
          <h1 className="brand-name">CardPin</h1>
        </div>
        <p className="subtitle">Find the best card from the cards you actually have.</p>
      </header>

      <CardPinCalculator />
      
      <footer className="site-footer">
        CardPin is not financial advice. Sources and reward rules are community-sourced; always verify current terms with your issuer before use.
      </footer>
    </div>
  );
}
