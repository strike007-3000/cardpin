import { useState, useEffect, useMemo, useRef } from "react";
import type { CountryDataset } from "@cardpin/engine";

export function useWalletDataset(country: string, audience: "consumer" | "business") {
  const [dataset, setDataset] = useState<CountryDataset | null>(null);
  const [ownedCardIds, setOwnedCardIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [cardMonthlySpends, setCardMonthlySpends] = useState<Record<string, number>>({});
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Catalog States
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const catalogDialogRef = useRef<HTMLDialogElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  // Load dataset and owned cards when country changes
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

  // Load monthly spends from localStorage when dataset is available
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

  const availableCards = useMemo(
    () => dataset?.cards.filter((card) => (card.audience ?? "consumer") === audience) ?? [],
    [audience, dataset]
  );

  const ownedCards = useMemo(
    () => availableCards.filter((card) => ownedCardIds.includes(card.id)),
    [availableCards, ownedCardIds]
  );

  // Synchronize active card selection with owned cards
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

  function handleUpdateMonthlySpend(cardId: string, value: number) {
    const updated = { ...cardMonthlySpends, [cardId]: value };
    setCardMonthlySpends(updated);
    localStorage.setItem(`cardpin:monthly_spend:${cardId}`, String(value));
  }

  function handleOpenCatalog() {
    catalogDialogRef.current?.showModal();
    catalogSearchRef.current?.focus();
  }

  function handleCloseCatalog() {
    catalogDialogRef.current?.close();
  }

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
        } catch {
          alert("Failed to parse the backup file.");
        }
      };
    }
  }

  return {
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
  };
}
