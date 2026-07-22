"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recommendBestCard } from "@cardpin/engine";
import type { Card, CountryDataset } from "@cardpin/engine";
import { getFxRate, rewardLabel, rewardAmount, cleanExplanation } from "../lib/utils";
import { cn } from "../lib/utils";
import type { CardCalc } from "../lib/utils";
import { useFxRates } from "../lib/use-fx-rates";
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
  const [dataset, setDataset] = useState<CountryDataset | null>(null);
  const [ownedCardIds, setOwnedCardIds] = useState<string[]>([]);
  const [merchantQuery, setMerchantQuery] = useState<string>("");
  const [categoryQuery, setCategoryQuery] = useState<string>("");
  const [spendInput, setSpendInput] = useState<string>("50");
  const [isForeignSpend, setIsForeignSpend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<"consumer" | "business">("consumer");

  const [spendCurrency, setSpendCurrency] = useState<string>("EUR");
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [showFullInstructions, setShowFullInstructions] = useState<boolean>(false);

  const { fxRates, fxStatus } = useFxRates(spendCurrency);
  const [cardMonthlySpends, setCardMonthlySpends] = useState<Record<string, number>>({});
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Catalog States
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const catalogDialogRef = useRef<HTMLDialogElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  // Developer Mode States
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [devCountry, setDevCountry] = useState<string>("be");
  const [devDataType, setDevDataType] = useState<string>("cards");
  const [devJson, setDevJson] = useState<string>("");
  const [devStatus, setDevStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const spendAmount = normalizeSpend(spendInput);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "true") {
        setIsDevMode(true);
      }
    }
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem("cardpin:welcome_dismissed");
    setShowWelcome(!dismissed);
  }, []);

  // Load monthly spends from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && dataset) {
      const spends: Record<string, number> = {};
      dataset.cards.forEach((card) => {
        const saved = localStorage.getItem(`cardpin:monthly_spend:${card.id}`);
        if (saved) {
          spends[card.id] = Number(saved) || 0;
        }
      });
      setCardMonthlySpends(spends);
    }
  }, [dataset]);

  // Fetch live FX rates only when a non-EUR transaction needs them.


  function handleOpenCatalog() {
    catalogDialogRef.current?.showModal();
    catalogSearchRef.current?.focus();
  }

  // Close Catalog
  function handleCloseCatalog() {
    catalogDialogRef.current?.close();
  }

  function handleUpdateMonthlySpend(cardId: string, value: number) {
    const updated = { ...cardMonthlySpends, [cardId]: value };
    setCardMonthlySpends(updated);
    localStorage.setItem(`cardpin:monthly_spend:${cardId}`, String(value));
  }

  useEffect(() => {
    async function fetchDataset() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/data/${country.toLowerCase()}.json`);
        if (!res.ok) throw new Error(`Country data not available: ${res.statusText}`);
        const data = (await res.json()) as CountryDataset;
        setDataset(data);

        const saved = localStorage.getItem(`cardpin:owned_cards:${country}`);
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          setOwnedCardIds(parsed.filter((id) => data.cards.some((card) => card.id === id)));
        } else {
          setOwnedCardIds([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load country dataset.");
      } finally {
        setLoading(false);
      }
    }

    fetchDataset();
  }, [country]);

  const availableCards = useMemo(
    () => dataset?.cards.filter((card) => (card.audience ?? "consumer") === audience) ?? [],
    [audience, dataset]
  );

  const ownedCards = useMemo(
    () => availableCards.filter((card) => ownedCardIds.includes(card.id)),
    [availableCards, ownedCardIds]
  );

  useEffect(() => {
    if (ownedCards.length > 0 && (!activeCardId || !ownedCardIds.includes(activeCardId))) {
      setActiveCardId(ownedCards[0].id);
    } else if (ownedCards.length === 0) {
      setActiveCardId(null);
    }
  }, [ownedCards, activeCardId, ownedCardIds]);

  const categoriesList = useMemo(
    () => Array.from(new Set(dataset?.merchants.flatMap((merchant) => merchant.categories) ?? [])).sort(),
    [dataset]
  );

  const catalogCards = useMemo(() => {
    return availableCards.filter((card) => {
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      const issuer = dataset?.issuers.find((i) => i.id === card.issuerId);
      return card.name.toLowerCase().includes(q) || (issuer?.name.toLowerCase().includes(q) ?? false);
    });
  }, [availableCards, catalogSearch, dataset]);

  function handleToggleCard(cardId: string) {
    const updated = ownedCardIds.includes(cardId)
      ? ownedCardIds.filter((id) => id !== cardId)
      : [...ownedCardIds, cardId];
    setOwnedCardIds(updated);
    localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(updated));
  }

  function handleDismissWelcome() {
    setShowWelcome(false);
    localStorage.setItem("cardpin:welcome_dismissed", "true");
  }

  // Backup Import/Export
  function handleExportWallet() {
    const dataStr = JSON.stringify({ cardIds: ownedCardIds });
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `cardpin_wallet_${country}_${audience}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }

  function handleImportWallet(e: React.ChangeEvent<HTMLInputElement>) {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.cardIds)) {
            const validIds = parsed.cardIds.filter((id: string) => dataset?.cards.some((card) => card.id === id));
            setOwnedCardIds(validIds);
            localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(validIds));
          } else {
            alert("Invalid backup file structure.");
          }
        } catch (err) {
          alert("Failed to parse the backup file.");
        }
      };
    }
  }

  function handleSpendBlur() {
    const parsed = Number(spendInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSpendInput("50");
    } else {
      setSpendInput(String(parsed));
    }
  }

  async function handleMergeSubmit() {
    setDevStatus({ type: "loading", message: "Saving data and compiling..." });
    try {
      let parsed;
      try {
        parsed = JSON.parse(devJson);
      } catch (e) {
        throw new Error("Invalid JSON: Please check the syntax.");
      }

      const res = await fetch("http://localhost:3001/api/update-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: devCountry,
          dataType: devDataType,
          data: parsed
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update data");
      }

      setDevStatus({ type: "success", message: "Saved, validated, and compiled successfully. Reloading..." });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setDevStatus({ type: "error", message: err.message });
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
      includeUnownedCards: true
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
          audience
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

        const netValue = rule?.rewardType === "cashback_percentage" || rule?.rewardType === "fixed_cashback"
          ? Math.max(0, grossValue - fxFee)
          : grossValue;

        const displayGross = grossValue;
        const displayNet = netValue;
        const displayFxFee = fxFee;

        return {
          card,
          rule,
          rec: {
            ...rec,
            unownedUnlockCard: overallRec.unownedUnlockCard
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
            label: ""
          })
        };
      })
      .sort((a, b) => b.netValue - a.netValue);
  }, [categoryQuery, country, dataset, isForeignSpend, merchantQuery, ownedCards, spendAmount, cardMonthlySpends, fxRates, spendCurrency]);

  const hasSearch = merchantQuery.trim() !== "" || categoryQuery !== "";
  const isFxRateMissing = getFxRate(fxRates, spendCurrency) === null;
  const bestResult = cardResults.find((result) => result.rule) ?? null;
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
    spendAmount,
    isForeignSpend,
    alternatives,
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

      {isDevMode && !showDevPanel && (
        <button
          type="button"
          onClick={() => setShowDevPanel(true)}
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
            cursor: "pointer"
          }}
        >
          🔧 Dev Tools
        </button>
      )}

      {showDevPanel && (
        <DevPanel
          country={devCountry}
          setCountry={setDevCountry}
          dataType={devDataType}
          setDataType={setDevDataType}
          devJson={devJson}
          setDevJson={setDevJson}
          devStatus={devStatus}
          onMerge={handleMergeSubmit}
          onClose={() => setShowDevPanel(false)}
        />
      )}
    </>
  );
}
