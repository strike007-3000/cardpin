"use client";

import { useEffect, useMemo, useState } from "react";
import { recommendBestCard } from "@cardpin/engine";
import { getFxRate, rewardLabel, rewardAmount, cleanExplanation } from "../lib/utils";
import type { CardCalc } from "../lib/utils";
import { useFxRates } from "../lib/use-fx-rates";
import { useWalletDataset } from "../lib/use-wallet-dataset";
import { useDevTools } from "../lib/use-dev-tools";
import MainLayout from "../components/MainLayout";
import NavigationBar from "../components/NavigationBar";
import CountryAudienceSelector from "../components/CountryAudienceSelector";
import InputStrip from "../components/InputStrip";
import ResultHero from "../components/ResultHero";
import WalletManager from "../components/WalletManager";
import StatusBanner from "../components/StatusBanner";
import WelcomeBanner from "../components/WelcomeBanner";
import DevPanel from "../components/DevPanel";

function normalizeSpend(raw: string) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return parsed;
}

export default function CardPinCalculator() {
  const [country, setCountry] = useState<string>("be");
  const [audience, setAudience] = useState<"consumer" | "business">("consumer");
  const [merchantQuery, setMerchantQuery] = useState<string>("");
  const [categoryQuery, setCategoryQuery] = useState<string>("");
  const [spendInput, setSpendInput] = useState<string>("50");
  const [isForeignSpend, setIsForeignSpend] = useState<boolean>(false);
  const [spendCurrency, setSpendCurrency] = useState<string>("EUR");
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [showFullInstructions, setShowFullInstructions] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { fxRates, fxStatus } = useFxRates(spendCurrency);
  const walletDataset = useWalletDataset(country, audience);
  const devTools = useDevTools();

  const {
    dataset,
    ownedCardIds,
    setOwnedCardIds,
    loading,
    error,
    cardMonthlySpends,
    activeCardId,
    setActiveCardId,
    availableCards,
    ownedCards,
    categoriesList,
    catalogSearch,
    setCatalogSearch,
    catalogCards,
    catalogDialogRef,
    catalogSearchRef,
    handleToggleCard,
    handleUpdateMonthlySpend,
    handleOpenCatalog,
    handleCloseCatalog,
    handleExportWallet,
    handleImportWallet,
  } = walletDataset;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem("cardpin:welcome_dismissed");
    setShowWelcome(!dismissed);
  }, []);

  const spendAmount = normalizeSpend(spendInput);

  function handleDismissWelcome() {
    setShowWelcome(false);
    localStorage.setItem("cardpin:welcome_dismissed", "true");
  }

  function handleSpendBlur() {
    const parsed = Number(spendInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSpendInput("50");
    } else {
      setSpendInput(String(parsed));
    }
  }

  const cardResults: CardCalc[] = useMemo(() => {
    if (!dataset || !ownedCards.length) return [];

    const rate = getFxRate(fxRates, spendCurrency);
    if (rate === null) return [];
    const convertedSpend = spendCurrency !== "EUR" ? spendAmount / rate : spendAmount;
    const isForeign = spendCurrency !== "EUR" || isForeignSpend;

    const overallRec = recommendBestCard({
      merchant: merchantQuery,
      category: categoryQuery,
      ownedCards,
      country: country.toUpperCase(),
      dataset,
      spendAmount: convertedSpend,
      isForeignSpend: isForeign,
      cardMonthlySpends,
      audience,
      includeUnownedCards: true,
    });

    return ownedCards
      .map((card) => {
        const rec = recommendBestCard({
          merchant: merchantQuery,
          category: categoryQuery,
          ownedCards: [card],
          country: country.toUpperCase(),
          dataset,
          spendAmount: convertedSpend,
          isForeignSpend: isForeign,
          cardMonthlySpends,
          audience,
        });
        const rule = rec.bestRule;
        const fxFee = isForeign ? convertedSpend * (card.fxFeePercentage ?? 0) : 0;
        let grossValue = 0;

        const bgCap = rule?.cap ?? rule?.conditions?.cap;
        const minSpend = rule?.conditions?.minSpend ?? 0;
        const monthlySpend = cardMonthlySpends[card.id] ?? 0;

        if (rule) {
          if (minSpend > 0 && convertedSpend < minSpend) {
            grossValue = 0;
          } else if (bgCap !== undefined) {
            const earnedSoFar = monthlySpend * rule.rewardValue;
            const remainingReward = Math.max(0, bgCap - earnedSoFar);
            if (remainingReward === 0) {
              grossValue = 0;
            } else {
              if (rule.rewardType === "cashback_percentage") {
                grossValue = Math.min(remainingReward, convertedSpend * rule.rewardValue);
              } else if (rule.rewardType === "fixed_cashback") {
                grossValue = Math.min(remainingReward, rule.rewardValue);
              } else {
                grossValue = Math.min(remainingReward, convertedSpend * rule.rewardValue);
              }
            }
          } else {
            if (rule.rewardType === "cashback_percentage") grossValue = convertedSpend * rule.rewardValue;
            if (rule.rewardType === "fixed_cashback") grossValue = rule.rewardValue;
            if (rule.rewardType === "points" || rule.rewardType === "miles") grossValue = convertedSpend * rule.rewardValue;
          }
        }

        const netValue =
          rule?.rewardType === "cashback_percentage" || rule?.rewardType === "fixed_cashback"
            ? Math.max(0, grossValue - fxFee)
            : grossValue - fxFee;

        const displayGross = grossValue;
        const displayNet = netValue;
        const displayFxFee = fxFee;

        return {
          card,
          rule,
          rec: {
            ...rec,
            unownedUnlockCard: overallRec.unownedUnlockCard,
          },
          rewardType: rec.rewardType,
          grossValue: displayGross,
          fxFee: displayFxFee,
          netValue: displayNet,
          label: rewardLabel({
            card,
            rule,
            rec,
            rewardType: rec.rewardType,
            grossValue: displayGross,
            fxFee: displayFxFee,
            netValue: displayNet,
            label: "",
          }),
        };
      })
      .sort((a, b) => b.netValue - a.netValue);
  }, [
    categoryQuery,
    country,
    dataset,
    isForeignSpend,
    merchantQuery,
    ownedCards,
    spendAmount,
    cardMonthlySpends,
    fxRates,
    spendCurrency,
    audience,
  ]);

  const hasSearch = merchantQuery.trim() !== "" || categoryQuery !== "";
  const isFxRateMissing = getFxRate(fxRates, spendCurrency) === null;
  // Best result is top rule-matching card, or fallback to top base card if no specific rule matched
  const bestResult = cardResults.find((result) => result.rule) ?? cardResults[0] ?? null;
  const alternatives = cardResults.filter((result) => result.card.id !== bestResult?.card.id).slice(0, 4);

  const resultHeroOrStatusElement = useMemo(() => {
    if (error || ownedCards.length === 0 || !hasSearch || isFxRateMissing || !bestResult) {
      return (
        <StatusBanner
          ownedCardsLength={ownedCards.length}
          hasSearch={hasSearch}
          isFxRateMissing={isFxRateMissing}
          fxStatus={fxStatus}
          spendCurrency={spendCurrency}
          error={error}
          bestResultExists={bestResult !== null}
          handleOpenCatalog={handleOpenCatalog}
        />
      );
    }

    return (
      <ResultHero
        bestResult={bestResult}
        spendAmount={spendAmount}
        isForeignSpend={spendCurrency !== "EUR" || isForeignSpend}
        rewardAmount={rewardAmount}
        cleanExplanation={cleanExplanation}
        rewardLabel={rewardLabel}
        alternatives={alternatives}
        cardMonthlySpends={cardMonthlySpends}
      />
    );
  }, [
    error,
    ownedCards.length,
    hasSearch,
    isFxRateMissing,
    fxStatus,
    spendCurrency,
    bestResult,
    handleOpenCatalog,
    spendAmount,
    isForeignSpend,
    alternatives,
    cardMonthlySpends,
  ]);

  return (
    <>
      {loading || showWelcome === null ? (
        <div className="loading-container">Loading card datasets...</div>
      ) : (
        <MainLayout
          navigationBar={<NavigationBar isScrolled={isScrolled} />}
          welcomeBanner={
            showWelcome === true && (
              <WelcomeBanner
                showWelcome={showWelcome}
                showFullInstructions={showFullInstructions}
                setShowFullInstructions={setShowFullInstructions}
                onDismiss={handleDismissWelcome}
              />
            )
          }
          countryAudienceSelector={
            <CountryAudienceSelector
              country={country}
              setCountry={setCountry}
              audience={audience}
              setAudience={setAudience}
            />
          }
          resultHeroOrStatus={resultHeroOrStatusElement}
          inputStrip={
            <InputStrip
              merchantQuery={merchantQuery}
              setMerchantQuery={setMerchantQuery}
              categoryQuery={categoryQuery}
              setCategoryQuery={setCategoryQuery}
              spendInput={spendInput}
              setSpendInput={setSpendInput}
              spendCurrency={spendCurrency}
              setSpendCurrency={setSpendCurrency}
              isForeignSpend={isForeignSpend}
              setIsForeignSpend={setIsForeignSpend}
              categoriesList={categoriesList}
              handleSpendBlur={handleSpendBlur}
              disabled={ownedCards.length === 0}
            />
          }
          walletManager={
            <WalletManager
              country={country}
              ownedCardIds={ownedCardIds}
              ownedCards={ownedCards}
              availableCards={availableCards}
              activeCardId={activeCardId}
              setActiveCardId={setActiveCardId}
              cardMonthlySpends={cardMonthlySpends}
              handleUpdateMonthlySpend={handleUpdateMonthlySpend}
              handleToggleCard={handleToggleCard}
              handleExportWallet={handleExportWallet}
              handleImportWallet={handleImportWallet}
              setOwnedCardIds={setOwnedCardIds}
              dataset={dataset}
              catalogSearch={catalogSearch}
              setCatalogSearch={setCatalogSearch}
              catalogCards={catalogCards}
              handleOpenCatalog={handleOpenCatalog}
              handleCloseCatalog={handleCloseCatalog}
              catalogDialogRef={catalogDialogRef}
              catalogSearchRef={catalogSearchRef}
            />
          }
        />
      )}

      {devTools.isDevMode && !devTools.showDevPanel && (
        <button
          type="button"
          onClick={() => devTools.setShowDevPanel(true)}
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            zIndex: 50,
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "0.875rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔧 Dev Tools
        </button>
      )}

      {devTools.showDevPanel && (
        <DevPanel
          country={devTools.devCountry}
          setCountry={devTools.setDevCountry}
          dataType={devTools.devDataType}
          setDataType={devTools.setDevDataType}
          devJson={devTools.devJson}
          setDevJson={devTools.setDevJson}
          devStatus={devTools.devStatus}
          onMerge={devTools.handleMergeSubmit}
          onClose={() => devTools.setShowDevPanel(false)}
        />
      )}
    </>
  );
}
